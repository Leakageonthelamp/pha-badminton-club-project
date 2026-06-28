<script lang="ts">
	import { onMount } from 'svelte';
	import generatePayload from 'promptpay-qr';
	import QRCode from 'qrcode';

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

	onMount(async () => {
		if (!target || amount <= 0) {
			errorMessage = 'Payment details are not available.';
			return;
		}

		try {
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
	});
</script>

<div class="flex flex-col items-center gap-3">
	<p class="text-sm font-medium text-slate-800">{label}</p>

	{#if dataUrl}
		<img src={dataUrl} alt="PromptPay QR code" class="h-60 w-60 rounded-2xl border border-slate-200 bg-white p-3" />
	{:else if errorMessage}
		<p class="text-sm text-red-600">{errorMessage}</p>
	{:else}
		<div
			class="flex h-60 w-60 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500"
		>
			Generating QR…
		</div>
	{/if}
</div>
