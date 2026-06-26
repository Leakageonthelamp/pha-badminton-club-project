<script lang="ts">
	import SubmitButton from './SubmitButton.svelte';
	import {
		getLocationAccessState,
		locationFailureMessage,
		locationSuccessMessage,
		requestAndStoreUserLocation,
		type LocationAccessState
	} from '../geolocation';

	let {
		title = 'Location is required',
		description = 'Allow location access so we can show nearby clubs and help you set venues on the map.'
	}: {
		title?: string;
		description?: string;
	} = $props();

	let accessState = $state<LocationAccessState>('prompt');
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);
	let infoMessage = $state<string | null>(null);

	$effect(() => {
		if (typeof window === 'undefined') return;
		accessState = getLocationAccessState();
	});

	async function enableLocation() {
		loading = true;
		errorMessage = null;
		infoMessage = null;

		try {
			const result = await requestAndStoreUserLocation();
			if (result.ok) {
				accessState = 'granted';
				infoMessage = locationSuccessMessage(result.approximate);
				return;
			}

			errorMessage = locationFailureMessage(result.reason, {
				code: result.code,
				message: result.message
			});
			accessState =
				result.reason === 'denied'
					? 'denied'
					: result.reason === 'unsupported'
						? 'unsupported'
						: 'prompt';
		} finally {
			loading = false;
		}
	}
</script>

{#if accessState === 'granted' && infoMessage}
	<div class="app-location-prompt">
		<p class="text-sm text-slate-700">{infoMessage}</p>
	</div>
{:else if accessState === 'prompt'}
	<div class="app-location-prompt">
		<div class="min-w-0">
			<p class="font-medium text-slate-900">{title}</p>
			<p class="mt-1 text-sm text-slate-600">{description}</p>
			{#if errorMessage}
				<p class="mt-2 text-sm text-amber-800">{errorMessage}</p>
			{/if}
		</div>
		<SubmitButton
			type="button"
			class="!w-auto shrink-0 !py-2.5 !text-sm"
			loading={loading}
			loadingLabel="Locating…"
			onclick={enableLocation}
		>
			Use current location
		</SubmitButton>
	</div>
{:else if accessState === 'denied'}
	<div class="app-location-prompt app-location-prompt--warning">
		<p class="text-sm font-medium text-amber-900">Location access is turned off</p>
		<p class="mt-1 text-sm text-amber-800">
			{errorMessage ??
				'This app needs your location to work properly. Enable it in your browser or device settings, then tap below.'}
		</p>
		<SubmitButton
			type="button"
			variant="secondary"
			class="mt-3 !w-auto !py-2.5 !text-sm"
			loading={loading}
			loadingLabel="Locating…"
			onclick={enableLocation}
		>
			Try again
		</SubmitButton>
	</div>
{:else if accessState === 'unsupported'}
	<div class="app-location-prompt app-location-prompt--warning">
		<p class="text-sm font-medium text-amber-900">Location not available</p>
		<p class="mt-1 text-sm text-amber-800">
			{errorMessage ?? 'This browser does not support location services.'}
		</p>
	</div>
{/if}
