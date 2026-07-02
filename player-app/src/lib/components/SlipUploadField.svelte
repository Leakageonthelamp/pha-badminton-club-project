<script lang="ts">
	import SlipPreviewButton from '@repo/ui/components/SlipPreviewButton.svelte';
	import SlipPreviewModal from '@repo/ui/components/SlipPreviewModal.svelte';
	import {
		compressSlipToFile,
		validateSlipFile,
		validateSlipInput
	} from '$lib/images/compressSlip';

	let {
		file = $bindable(null as File | null),
		disabled = false
	}: {
		file?: File | null;
		disabled?: boolean;
	} = $props();

	let previewUrl = $state<string | null>(null);
	let previewOpen = $state(false);
	let errorMessage = $state<string | null>(null);
	let processing = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);

	const revokePreview = () => {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = null;
		}
	};

	const onPick = async (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		const picked = input.files?.[0] ?? null;
		input.value = '';

		errorMessage = null;
		revokePreview();
		file = null;

		const validationError = validateSlipInput(picked);
		if (validationError) {
			errorMessage = validationError;
			return;
		}

		processing = true;
		try {
			const compressed = await compressSlipToFile(picked!);
			const postError = validateSlipFile(compressed);
			if (postError) {
				errorMessage = postError;
				return;
			}

			file = compressed;
			previewUrl = URL.createObjectURL(compressed);
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Could not process image.';
		} finally {
			processing = false;
		}
	};

	$effect(() => () => revokePreview());
</script>

<div class="space-y-2">
	<label class="block text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-600" for="slip-upload-input">
		Bank transfer slip <span class="text-red-600">*</span>
	</label>
	<input
		id="slip-upload-input"
		bind:this={inputEl}
		type="file"
		accept="image/*"
		class="sr-only"
		{disabled}
		onchange={onPick}
	/>
	<div class="flex flex-wrap items-center gap-2">
		<button
			type="button"
			class="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-950 disabled:opacity-50"
			disabled={disabled || processing}
			onclick={() => inputEl?.click()}
		>
			{processing ? 'Processing…' : file ? 'Change slip' : 'Attach slip'}
		</button>
		{#if file}
			<span class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Ready to upload</span>
			<SlipPreviewButton label="Preview" onclick={() => (previewOpen = true)} />
		{/if}
	</div>
	{#if errorMessage}
		<p class="text-sm text-red-600">{errorMessage}</p>
	{/if}
</div>

<SlipPreviewModal
	open={previewOpen}
	imageUrl={previewUrl ?? ''}
	onClose={() => (previewOpen = false)}
/>
