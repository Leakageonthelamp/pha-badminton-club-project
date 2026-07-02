<script lang="ts">
	import AppModal from './AppModal.svelte';
	import { t } from '../i18n/i18n.svelte';

	let {
		open = false,
		imageUrl = '',
		title,
		onClose
	}: {
		open?: boolean;
		imageUrl?: string;
		title?: string;
		onClose: () => void;
	} = $props();

	let imageLoading = $state(false);
	let imageFailed = $state(false);
	let imgEl = $state<HTMLImageElement | null>(null);

	const resolvedTitle = $derived(title ?? t('slip.title'));

	$effect(() => {
		imageUrl;
		imageFailed = false;
		imageLoading = Boolean(imageUrl?.trim());
	});

	$effect(() => {
		const img = imgEl;
		const url = imageUrl?.trim();
		if (!img || !url || imageFailed) return;

		if (img.complete) {
			imageLoading = false;
			if (img.naturalWidth === 0) {
				imageFailed = true;
			}
		}
	});
</script>

<AppModal {open} labelledBy="slip-preview-title" {onClose}>
	<div class="app-card-padded space-y-4">
		<h2 id="slip-preview-title" class="text-lg font-semibold text-slate-900 dark:text-slate-100">
			{resolvedTitle}
		</h2>
		{#if imageUrl && !imageFailed}
			<div class="relative min-h-48 w-full">
				{#if imageLoading}
					<div
						class="app-skeleton flex min-h-48 w-full items-center justify-center rounded-lg"
						aria-hidden="true"
					>
						<span class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
							{t('slip.loading')}
						</span>
					</div>
				{/if}
				<img
					bind:this={imgEl}
					src={imageUrl}
					alt={t('slip.alt')}
					loading="lazy"
					decoding="async"
					class="max-h-[70vh] w-full rounded-lg object-contain transition-opacity duration-200 {imageLoading
						? 'absolute inset-0 opacity-0'
						: 'opacity-100'}"
					onload={() => (imageLoading = false)}
					onerror={() => {
						imageFailed = true;
						imageLoading = false;
					}}
				/>
			</div>
		{:else}
			<p class="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
				{t('slip.unavailable')}
			</p>
		{/if}
	</div>
</AppModal>
