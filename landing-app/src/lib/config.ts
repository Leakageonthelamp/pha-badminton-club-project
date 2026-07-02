import { PUBLIC_APP_NAME, PUBLIC_PLAYER_APP_URL } from '$env/static/public';

const DEFAULT_PLAYER_APP_URL = 'https://player.antonsmash.app';

/** Normalize player-app URL for QR codes and install links. */
export function playerAppInstallUrl(rawUrl = PUBLIC_PLAYER_APP_URL): string {
	const trimmed = rawUrl.trim();
	if (!trimmed) return DEFAULT_PLAYER_APP_URL;

	try {
		const url = new URL(trimmed);
		url.hash = '';
		return url.toString().replace(/\/$/, '') || DEFAULT_PLAYER_APP_URL;
	} catch {
		return DEFAULT_PLAYER_APP_URL;
	}
}

export const landingConfig = {
	appName: PUBLIC_APP_NAME || 'Antonsmash',
	playerAppUrl: playerAppInstallUrl()
} as const;
