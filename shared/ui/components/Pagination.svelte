<script lang="ts">
	import { t } from '../i18n/i18n.svelte';

	let {
		page,
		hasPrev,
		hasNext,
		totalPages,
		prevHref,
		nextHref,
		onprev,
		onnext,
		pending = null,
		disabled = false,
		size = 'sm',
		class: className = ''
	}: {
		page: number;
		hasPrev: boolean;
		hasNext: boolean;
		totalPages?: number;
		prevHref?: string;
		nextHref?: string;
		onprev?: () => void;
		onnext?: () => void;
		pending?: 'prev' | 'next' | null;
		disabled?: boolean;
		size?: 'sm' | 'xs';
		class?: string;
	} = $props();

	const sizeClass = $derived(size === 'xs' ? 'text-xs' : 'text-sm');
	const pageLabel = $derived(
		totalPages !== undefined
			? t('pagination.pageOf', { page, total: totalPages })
			: `${page}`
	);
	const controlClass = $derived(
		`inline-flex items-center gap-1.5 font-medium text-brand-700 dark:text-brand-300 hover:text-brand-800 dark:text-brand-300 disabled:opacity-50 ${sizeClass}`
	);
</script>

{#if hasPrev || hasNext}
	<nav
		class="flex items-center justify-center gap-3 pt-1 {sizeClass} {className}"
		aria-label={t('pagination.label')}
	>
		{#if hasPrev}
			{#if prevHref}
				<a href={prevHref} class={controlClass} aria-label={t('pagination.prevAria')}>
					{t('pagination.prev')}
				</a>
			{:else}
				<button
					type="button"
					class={controlClass}
					disabled={disabled || pending !== null}
					aria-busy={pending === 'prev'}
					aria-label={t('pagination.prevAria')}
					onclick={onprev}
				>
					{#if pending === 'prev'}
						<span
							class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-brand-700"
							aria-hidden="true"
						></span>
					{/if}
					{t('pagination.prev')}
				</button>
			{/if}
		{/if}

		<span class="text-slate-500 dark:text-slate-400 dark:text-slate-500">{pageLabel}</span>

		{#if hasNext}
			{#if nextHref}
				<a href={nextHref} class={controlClass} aria-label={t('pagination.nextAria')}>
					{t('pagination.next')}
				</a>
			{:else}
				<button
					type="button"
					class={controlClass}
					disabled={disabled || pending !== null}
					aria-busy={pending === 'next'}
					aria-label={t('pagination.nextAria')}
					onclick={onnext}
				>
					{#if pending === 'next'}
						<span
							class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-brand-700"
							aria-hidden="true"
						></span>
					{/if}
					{t('pagination.next')}
				</button>
			{/if}
		{/if}
	</nav>
{/if}
