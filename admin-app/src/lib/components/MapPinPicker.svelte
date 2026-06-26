<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy, onMount } from 'svelte';
	import type { Map, Marker } from 'leaflet';

	const DEFAULT_CENTER = { lat: 13.7563, lng: 100.5018 };
	const DEFAULT_ZOOM = 13;

	let {
		latitude = $bindable<number | null>(null),
		longitude = $bindable<number | null>(null),
		disabled = false
	}: {
		latitude?: number | null;
		longitude?: number | null;
		disabled?: boolean;
	} = $props();

	let mapContainer: HTMLDivElement | undefined = $state();
	let map: Map | null = null;
	let marker: Marker | null = null;
	let leaflet: typeof import('leaflet') | null = null;
	let ready = $state(false);

	const hasPin = $derived(latitude !== null && longitude !== null);

	const setMarker = (lat: number, lng: number) => {
		if (!map || !leaflet) return;

		latitude = lat;
		longitude = lng;

		if (marker) {
			marker.setLatLng([lat, lng]);
		} else {
			marker = leaflet.marker([lat, lng], { draggable: !disabled }).addTo(map);
			marker.on('dragend', () => {
				const pos = marker?.getLatLng();
				if (!pos || disabled) return;
				latitude = pos.lat;
				longitude = pos.lng;
			});
		}
	};

	onMount(async () => {
		if (!browser || !mapContainer) return;

		leaflet = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		// ponytail: Vite breaks Leaflet default marker asset paths
		const iconRetinaUrl = (await import('leaflet/dist/images/marker-icon-2x.png')).default;
		const iconUrl = (await import('leaflet/dist/images/marker-icon.png')).default;
		const shadowUrl = (await import('leaflet/dist/images/marker-shadow.png')).default;
		leaflet.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

		const center =
			latitude !== null && longitude !== null
				? { lat: latitude, lng: longitude }
				: DEFAULT_CENTER;

		map = leaflet.map(mapContainer, { scrollWheelZoom: !disabled }).setView(
			[center.lat, center.lng],
			hasPin ? 15 : DEFAULT_ZOOM
		);

		leaflet
			.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; OpenStreetMap contributors',
				maxZoom: 19
			})
			.addTo(map);

		if (latitude !== null && longitude !== null) {
			setMarker(latitude, longitude);
		}

		if (!disabled) {
			map.on('click', (event) => {
				setMarker(event.latlng.lat, event.latlng.lng);
			});
		}

		ready = true;
	});

	onDestroy(() => {
		map?.remove();
		map = null;
		marker = null;
	});
</script>

<div class="space-y-2">
	<div
		bind:this={mapContainer}
		class="h-64 w-full overflow-hidden rounded-xl border border-slate-300 bg-slate-100 {disabled
			? 'pointer-events-none opacity-60'
			: ''}"
		role="application"
		aria-label="Club location map"
	></div>
	{#if !ready}
		<p class="text-xs text-slate-500">Loading map…</p>
	{:else if !disabled}
		<p class="text-xs text-slate-500">Tap the map to drop a pin. Drag the pin to adjust.</p>
	{/if}
	{#if hasPin}
		<p class="font-mono text-xs text-slate-600">
			{latitude?.toFixed(6)}, {longitude?.toFixed(6)}
		</p>
	{:else}
		<p class="text-xs text-slate-500">No location set.</p>
	{/if}
</div>
