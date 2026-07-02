<script lang="ts">
	import SubmitButton from './SubmitButton.svelte';
	import { t } from '../i18n/i18n.svelte';
	import {
		getLocationAccessState,
		locationFailureMessage,
		locationSuccessMessage,
		requestAndStoreUserLocation,
		type LocationAccessState
	} from '../geolocation';

	let {
		title,
		description
	}: {
		title?: string;
		description?: string;
	} = $props();

	let accessState = $state<LocationAccessState>('prompt');
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);
	let infoMessage = $state<string | null>(null);

	const resolvedTitle = $derived(title ?? t('location.requiredTitle'));
	const resolvedDescription = $derived(description ?? t('location.requiredBody'));

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
		<p class="text-sm text-slate-700 dark:text-slate-300 dark:text-slate-600">{infoMessage}</p>
	</div>
{:else if accessState === 'prompt'}
	<div class="app-location-prompt">
		<div class="min-w-0">
			<p class="font-medium text-slate-900 dark:text-slate-100">{resolvedTitle}</p>
			<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
				{resolvedDescription}
			</p>
			{#if errorMessage}
				<p class="mt-2 text-sm text-amber-800">{errorMessage}</p>
			{/if}
		</div>
		<SubmitButton
			type="button"
			class="!w-auto shrink-0 !py-2.5 !text-sm"
			loading={loading}
			loadingLabel={t('location.locating')}
			onclick={enableLocation}
		>
			{t('location.useCurrentLocation')}
		</SubmitButton>
	</div>
{:else if accessState === 'denied'}
	<div class="app-location-prompt app-location-prompt--warning">
		<p class="text-sm font-medium text-amber-900">{t('location.offTitle')}</p>
		<p class="mt-1 text-sm text-amber-800">
			{errorMessage ?? t('location.deniedBody')}
		</p>
		<SubmitButton
			type="button"
			variant="secondary"
			class="mt-3 !w-auto !py-2.5 !text-sm"
			loading={loading}
			loadingLabel={t('location.locating')}
			onclick={enableLocation}
		>
			{t('location.tryAgain')}
		</SubmitButton>
	</div>
{:else if accessState === 'unsupported'}
	<div class="app-location-prompt app-location-prompt--warning">
		<p class="text-sm font-medium text-amber-900">{t('location.unavailableTitle')}</p>
		<p class="mt-1 text-sm text-amber-800">
			{errorMessage ?? t('location.unavailableBody')}
		</p>
	</div>
{/if}
