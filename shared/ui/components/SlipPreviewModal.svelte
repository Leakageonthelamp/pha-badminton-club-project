<script lang="ts">
	import AppModal from './AppModal.svelte';

	let {
		open = false,
		imageUrl = '',
		title = 'Bank transfer slip',
		onClose
	}: {
		open?: boolean;
		imageUrl?: string;
		title?: string;
		onClose: () => void;
	} = $props();

	let imageFailed = $state(false);

	$effect(() => {
		imageUrl;
		imageFailed = false;
	});
</script>

<AppModal {open} labelledBy="slip-preview-title" {onClose}>
	<div class="app-card-padded space-y-4">
		<h2 id="slip-preview-title" class="text-lg font-semibold text-slate-900">{title}</h2>
		{#if imageUrl && !imageFailed}
			<img
				src={imageUrl}
				alt="Bank transfer slip"
				class="max-h-[70vh] w-full rounded-lg object-contain"
				onerror={() => (imageFailed = true)}
			/>
		{:else}
			<p class="text-sm text-slate-600">
				Slip image unavailable (it may have been removed from storage).
			</p>
		{/if}
	</div>
</AppModal>
