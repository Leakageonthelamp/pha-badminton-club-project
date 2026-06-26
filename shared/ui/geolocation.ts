export const USER_LOCATION_STORAGE_KEY = 'ph:userLocation';
const LOCATION_DENIED_KEY = 'ph:locationDenied';

export type StoredUserLocation = {
	latitude: number;
	longitude: number;
	at: number;
	approximate?: boolean;
};

export type GeolocationFailureReason = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

export type GeolocationResult =
	| { ok: true; latitude: number; longitude: number; approximate?: boolean }
	| { ok: false; reason: GeolocationFailureReason; code?: number; message?: string };

export type LocationAccessState = 'unsupported' | 'prompt' | 'granted' | 'denied';

type PositionAttempt = {
	enableHighAccuracy: boolean;
	timeoutMs: number;
	maximumAgeMs: number;
};

const POSITION_ATTEMPTS: PositionAttempt[] = [
	{ enableHighAccuracy: false, timeoutMs: 15_000, maximumAgeMs: 300_000 },
	{ enableHighAccuracy: false, timeoutMs: 25_000, maximumAgeMs: 0 },
	{ enableHighAccuracy: true, timeoutMs: 20_000, maximumAgeMs: 60_000 }
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const isGeolocationSupported = (): boolean =>
	typeof navigator !== 'undefined' && 'geolocation' in navigator;

export const loadStoredUserLocation = (): StoredUserLocation | null => {
	if (typeof localStorage === 'undefined') return null;

	try {
		const raw = localStorage.getItem(USER_LOCATION_STORAGE_KEY);
		if (!raw) return null;

		const parsed = JSON.parse(raw) as StoredUserLocation;
		if (
			typeof parsed.latitude !== 'number' ||
			typeof parsed.longitude !== 'number' ||
			!Number.isFinite(parsed.latitude) ||
			!Number.isFinite(parsed.longitude)
		) {
			return null;
		}

		return parsed;
	} catch {
		return null;
	}
};

export const storeUserLocation = (
	latitude: number,
	longitude: number,
	approximate = false
): void => {
	if (typeof localStorage === 'undefined') return;

	localStorage.setItem(
		USER_LOCATION_STORAGE_KEY,
		JSON.stringify({ latitude, longitude, at: Date.now(), approximate } satisfies StoredUserLocation)
	);

	if (typeof sessionStorage !== 'undefined') {
		sessionStorage.removeItem(LOCATION_DENIED_KEY);
	}
};

export const markLocationDenied = (): void => {
	if (typeof sessionStorage !== 'undefined') {
		sessionStorage.setItem(LOCATION_DENIED_KEY, '1');
	}
};

export const clearLocationDenied = (): void => {
	if (typeof sessionStorage !== 'undefined') {
		sessionStorage.removeItem(LOCATION_DENIED_KEY);
	}
};

export const getLocationAccessState = (): LocationAccessState => {
	if (!isGeolocationSupported()) return 'unsupported';
	if (loadStoredUserLocation()) return 'granted';
	if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(LOCATION_DENIED_KEY) === '1') {
		return 'denied';
	}
	return 'prompt';
};

const getCurrentPosition = (
	attempt: PositionAttempt
): Promise<GeolocationPosition | GeolocationPositionError> =>
	new Promise((resolve) => {
		navigator.geolocation.getCurrentPosition(
			(position) => resolve(position),
			(error) => resolve(error),
			{
				enableHighAccuracy: attempt.enableHighAccuracy,
				timeout: attempt.timeoutMs,
				maximumAge: attempt.maximumAgeMs
			}
		);
	});

/** ponytail: watchPosition helps macOS Safari when getCurrentPosition returns kCLErrorLocationUnknown */
const watchPositionOnce = (attempt: PositionAttempt): Promise<GeolocationPosition | null> =>
	new Promise((resolve) => {
		let watchId = 0;
		let settled = false;

		const finish = (value: GeolocationPosition | null) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			navigator.geolocation.clearWatch(watchId);
			resolve(value);
		};

		const timer = setTimeout(() => finish(null), attempt.timeoutMs);

		watchId = navigator.geolocation.watchPosition(
			(position) => finish(position),
			(error) => {
				if (error.code === error.PERMISSION_DENIED) {
					finish(null);
				}
			},
			{
				enableHighAccuracy: attempt.enableHighAccuracy,
				maximumAge: attempt.maximumAgeMs
			}
		);
	});

const toFailureReason = (error: GeolocationPositionError): GeolocationResult => {
	if (error.code === error.PERMISSION_DENIED) {
		markLocationDenied();
		return { ok: false, reason: 'denied', code: error.code, message: error.message };
	}

	if (error.code === error.TIMEOUT) {
		return { ok: false, reason: 'timeout', code: error.code, message: error.message };
	}

	return { ok: false, reason: 'unavailable', code: error.code, message: error.message };
};

/** ponytail: Mac browsers often return code 2; IP lookup gives city-level fallback */
const requestApproximateLocationFromIp = async (): Promise<GeolocationResult> => {
	try {
		const response = await fetch('https://ipwho.is/');
		if (!response.ok) {
			return { ok: false, reason: 'unavailable' };
		}

		const data = (await response.json()) as {
			success?: boolean;
			latitude?: number;
			longitude?: number;
		};

		if (
			!data.success ||
			typeof data.latitude !== 'number' ||
			typeof data.longitude !== 'number' ||
			!Number.isFinite(data.latitude) ||
			!Number.isFinite(data.longitude)
		) {
			return { ok: false, reason: 'unavailable' };
		}

		return {
			ok: true,
			latitude: data.latitude,
			longitude: data.longitude,
			approximate: true
		};
	} catch {
		return { ok: false, reason: 'unavailable' };
	}
};

const finishWithIpFallback = async (
	lastError: GeolocationPositionError | null
): Promise<GeolocationResult> => {
	const approx = await requestApproximateLocationFromIp();
	if (approx.ok) {
		return approx;
	}

	if (lastError) {
		return toFailureReason(lastError);
	}

	return { ok: false, reason: 'unavailable' };
};

export const requestCurrentLocation = async (): Promise<GeolocationResult> => {
	clearLocationDenied();

	if (!isGeolocationSupported()) {
		return finishWithIpFallback(null);
	}

	let lastError: GeolocationPositionError | null = null;

	for (const attempt of POSITION_ATTEMPTS) {
		const result = await getCurrentPosition(attempt);

		if ('coords' in result) {
			return {
				ok: true,
				latitude: result.coords.latitude,
				longitude: result.coords.longitude
			};
		}

		lastError = result;

		if (result.code === result.PERMISSION_DENIED) {
			return toFailureReason(result);
		}

		await sleep(250);
	}

	const watched = await watchPositionOnce({
		enableHighAccuracy: false,
		timeoutMs: 20_000,
		maximumAgeMs: 300_000
	});

	if (watched) {
		return {
			ok: true,
			latitude: watched.coords.latitude,
			longitude: watched.coords.longitude
		};
	}

	return finishWithIpFallback(lastError);
};

export const locationFailureMessage = (
	reason: GeolocationFailureReason,
	debug?: { code?: number; message?: string }
): string => {
	let text: string;

	switch (reason) {
		case 'denied':
			text =
				'Location access is turned off. Enable it for this browser in System Settings or site permissions, then try again.';
			break;
		case 'timeout':
			text =
				'Location took too long. Move to a spot with better signal or drag the map to your venue.';
			break;
		case 'unsupported':
			text = 'This browser does not support location services.';
			break;
		default:
			text =
				'GPS is unavailable on this Mac (common on desktop). Drag the map to your venue, or try again on a phone with Wi‑Fi on.';
	}

	if (debug?.code !== undefined) {
		const codeHint =
			debug.code === 1
				? 'permission denied'
				: debug.code === 2
					? 'position unavailable (Mac: kCLErrorLocationUnknown — Wi‑Fi/GPS not ready yet)'
					: debug.code === 3
						? 'timed out'
						: 'unknown';
		text += ` [code ${debug.code}: ${codeHint}]`;
	}

	return text;
};

export const locationSuccessMessage = (approximate?: boolean): string | null =>
	approximate
		? 'GPS was unavailable — using approximate area from your network. Drag the map to set the exact spot.'
		: null;

export const requestAndStoreUserLocation = async (): Promise<GeolocationResult> => {
	const result = await requestCurrentLocation();
	if (result.ok) {
		storeUserLocation(result.latitude, result.longitude, result.approximate);
	}
	return result;
};
