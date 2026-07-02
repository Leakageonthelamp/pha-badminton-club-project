<script lang="ts">
	import { onMount } from 'svelte';

	let {
		target,
		amount,
		label = 'Scan to pay with PromptPay'
	}: {
		target: string;
		amount: number;
		label?: string;
	} = $props();

	let dataUrl = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);

	onMount(() => {
		if (!target || amount <= 0) {
			errorMessage = 'Payment details are not available.';
			return;
		}

		void (async () => {
			try {
				const [{ default: generatePayload }, QRCode] = await Promise.all([
					import('promptpay-qr'),
					import('qrcode')
				]);
				const payload = generatePayload(target, { amount });
				dataUrl = await QRCode.toDataURL(payload, {
					width: 240,
					margin: 1,
					color: { dark: '#1e293b', light: '#ffffff' }
				});
			} catch (error) {
				console.error('Failed to generate PromptPay QR', error);
				errorMessage = 'Could not generate payment QR.';
			}
		})();
	});
</script>

<div class="flex flex-col items-center gap-3">
	<p class="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>

	{#if dataUrl}
		<img src={dataUrl} alt="PromptPay QR code" class="h-60 w-60 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3" />
	{:else if errorMessage}
		<p class="text-sm text-red-600">{errorMessage}</p>
	{:else}
		<div
			class="flex h-60 w-60 items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500"
		>
			Generating QR…
		</div>
	{/if}
</div>
