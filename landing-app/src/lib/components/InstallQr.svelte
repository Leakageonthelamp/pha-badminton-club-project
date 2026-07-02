<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '$lib/i18n';

	let { url }: { url: string } = $props();

	let dataUrl = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);

	const label = $derived(t('landing.download.qrLabel'));
	const altText = $derived(t('landing.installQr.alt'));

	onMount(() => {
		if (!url) {
			errorMessage = t('landing.installQr.errorUnavailable');
			return;
		}

		void (async () => {
			try {
				const QRCode = await import('qrcode');
				dataUrl = await QRCode.toDataURL(url, {
					width: 280,
					margin: 2,
					color: { dark: '#652f85', light: '#ffffff' }
				});
			} catch (error) {
				console.error('Failed to generate install QR', error);
				errorMessage = t('landing.installQr.errorGenerate');
			}
		})();
	});
</script>

<div class="flex flex-col items-center gap-4">
	<p class="text-sm font-medium text-slate-800">{label}</p>

	{#if dataUrl}
		<img
			src={dataUrl}
			alt={altText}
			class="h-72 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-inner"
		/>
	{:else if errorMessage}
		<p class="text-sm text-red-600">{errorMessage}</p>
	{:else}
		<div
			class="flex h-72 w-72 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500"
		>
			{t('landing.installQr.generating')}
		</div>
	{/if}
</div>
