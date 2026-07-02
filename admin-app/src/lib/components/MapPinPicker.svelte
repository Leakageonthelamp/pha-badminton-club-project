<script lang="ts">
	import { t } from '$lib/i18n';
	import { browser } from '$app/environment';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import {
		loadStoredUserLocation,
		locationFailureMessage,
		locationSuccessMessage,
		requestAndStoreUserLocation,
		storeUserLocation
	} from '@repo/ui/geolocation';
	import { onDestroy, onMount, tick } from 'svelte';
	import type { Map } from 'leaflet';

	const DEFAULT_CENTER = { lat: 13.7563, lng: 100.5018 };
	const DEFAULT_ZOOM = 16;
	const MAP_TILES = {
		url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
	};

	let {
		latitude = $bindable<number | null>(null),
		longitude = $bindable<number | null>(null),
		locked = false,
		disabled = false,
		hideLockedHint = false
	}: {
		latitude?: number | null;
		longitude?: number | null;
		locked?: boolean;
		disabled?: boolean;
		hideLockedHint?: boolean;
	} = $props();

	let mapContainer: HTMLDivElement | undefined = $state();
	let map: Map | null = null;
	let ready = $state(false);
	let locateLoading = $state(false);
	let locationNotice = $state<string | null>(null);
	let locationNoticeKind = $state<'error' | 'info' | null>(null);

	/** Mirrors for use inside Leaflet handlers (destructured props are stale there). */
	let isLocked = $state(false);
	let isDisabled = $state(false);

	/** Live pin coords — updated from map events ($state so UI always reacts). */
	let pinLat = $state<number | null>(null);
	let pinLng = $state<number | null>(null);

	const hasPin = $derived(pinLat !== null && pinLng !== null);
	const editable = $derived(!isDisabled && !isLocked);

	const pushCoords = (lat: number, lng: number) => {
		pinLat = lat;
		pinLng = lng;
		latitude = lat;
		longitude = lng;
	};

	const syncCenterFromMap = () => {
		if (!map || isLocked || isDisabled) return;
		const center = map.getCenter();
		pushCoords(center.lat, center.lng);
	};

	const applyParentCoords = () => {
		if (!map || latitude === null || longitude === null) return;

		pinLat = latitude;
		pinLng = longitude;
		map.stop();
		map.setView([latitude, longitude], map.getZoom(), { animate: false });
	};

	$effect(() => {
		isLocked = locked;
		isDisabled = disabled;

		if (!map || !ready || !locked) return;
		if (latitude === null || longitude === null) return;

		applyParentCoords();
	});

	const flyTo = (lat: number, lng: number, zoom = DEFAULT_ZOOM) => {
		if (!map) return;
		map.setView([lat, lng], zoom, { animate: true });
		pushCoords(lat, lng);
	};

	const resolveInitialCenter = (): { lat: number; lng: number } => {
		if (latitude !== null && longitude !== null) {
			return { lat: latitude, lng: longitude };
		}

		const stored = loadStoredUserLocation();
		if (stored) {
			return { lat: stored.latitude, lng: stored.longitude };
		}

		return DEFAULT_CENTER;
	};

	async function useCurrentLocation() {
		if (!editable || !map) return;

		locateLoading = true;
		locationNotice = null;
		locationNoticeKind = null;

		try {
			const result = await requestAndStoreUserLocation();
			if (!result.ok) {
				locationNoticeKind = 'error';
				locationNotice = locationFailureMessage(result.reason, {
					code: result.code,
					message: result.message
				});
				return;
			}

			storeUserLocation(result.latitude, result.longitude, result.approximate);
			flyTo(result.latitude, result.longitude, result.approximate ? 13 : 17);
			const successMessage = locationSuccessMessage(result.approximate);
			if (successMessage) {
				locationNoticeKind = 'info';
				locationNotice = successMessage;
			}
		} finally {
			locateLoading = false;
		}
	}

	const refreshMapSize = async () => {
		await tick();
		map?.invalidateSize({ pan: false });
	};

	onMount(() => {
		if (!browser || !mapContainer) return;

		void (async () => {
			const leaflet = await import('leaflet');
			await import('leaflet/dist/leaflet.css');

			const initial = resolveInitialCenter();
			pushCoords(initial.lat, initial.lng);

			map = leaflet
				.map(mapContainer!, {
					dragging: true,
					scrollWheelZoom: true,
					touchZoom: true,
					doubleClickZoom: true,
					boxZoom: true,
					keyboard: true,
					zoomControl: false
				})
				.setView([initial.lat, initial.lng], hasPin ? 17 : DEFAULT_ZOOM);

			leaflet.control.zoom({ position: 'topleft' }).addTo(map);

			leaflet
				.tileLayer(MAP_TILES.url, {
					attribution: MAP_TILES.attribution,
					subdomains: 'abcd',
					maxZoom: 20
				})
				.addTo(map);

			map.on('move', syncCenterFromMap);
			map.on('moveend', syncCenterFromMap);
			map.on('zoomend', syncCenterFromMap);

			await refreshMapSize();
			ready = true;
		})();
	});

	$effect(() => {
		if (!map || !ready || locked) return;
		void refreshMapSize();
	});

	onDestroy(() => {
		map?.off('move', syncCenterFromMap);
		map?.off('moveend', syncCenterFromMap);
		map?.off('zoomend', syncCenterFromMap);
		map?.remove();
		map = null;
	});
</script>

<div class="space-y-3">
	<div
		class="relative h-72 w-full overflow-hidden rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 {disabled
			? 'opacity-60'
			: ''}"
	>
		<div bind:this={mapContainer} class="absolute inset-0 z-0 h-full w-full"></div>

		{#if locked && !disabled}
			<div class="absolute inset-0 z-[500] cursor-default bg-slate-50/25" aria-hidden="true"></div>
		{/if}

		<div
			class="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center"
			aria-hidden="true"
		>
			<div class="relative h-0 w-0">
				<div
					class="pointer-events-none absolute left-0 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-700 ring-2 ring-white shadow-sm"
				></div>
				<svg
					class="pointer-events-none absolute bottom-0 left-1/2 h-7 w-7 -translate-x-1/2 drop-shadow-md"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M12 22s7-4.6 7-11a7 7 0 1 0-14 0c0 6.4 7 11 7 11Z"
						fill="#964ac0"
						stroke="#652f85"
						stroke-width="1.25"
					/>
				</svg>
			</div>
		</div>
	</div>

	{#if !ready}
		<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Loading map…</p>
	{:else if locked}
		{#if !hideLockedHint}
			<p class="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">Location is saved. Tap Change location to move the pin.</p>
		{/if}
	{:else if !disabled}
		<p class="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
			Drag the map so the dot sits on your club venue. That spot is what gets saved.
		</p>
		<SubmitButton
			type="button"
			variant="secondary"
			class="!w-auto !py-2.5 !text-sm"
			loading={locateLoading}
			loadingLabel={t('mapPin.locating')}
			onclick={useCurrentLocation}
		>
			Use my current location
		</SubmitButton>
	{/if}

	{#if locationNotice}
		<p
			class="rounded-xl border px-3 py-2 text-sm {locationNoticeKind === 'info'
				? 'border-brand-200 bg-brand-50 text-brand-900'
				: 'border-amber-200 bg-amber-50 text-amber-900'}"
		>
			{locationNotice}
		</p>
	{/if}

	{#if hasPin}
		<p class="font-mono text-xs text-slate-600 dark:text-slate-400 dark:text-slate-500">
			{pinLat!.toFixed(6)}, {pinLng!.toFixed(6)}
		</p>
	{/if}
</div>
