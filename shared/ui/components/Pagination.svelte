<script lang="ts">
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
		totalPages !== undefined ? `Page ${page} of ${totalPages}` : `${page}`
	);
	const controlClass = $derived(
		`inline-flex items-center gap-1.5 font-medium text-brand-700 hover:text-brand-800 disabled:opacity-50 ${sizeClass}`
	);
</script>

{#if hasPrev || hasNext}
	<nav
		class="flex items-center justify-center gap-3 pt-1 {sizeClass} {className}"
		aria-label="Pagination"
	>
		{#if hasPrev}
			{#if prevHref}
				<a href={prevHref} class={controlClass} aria-label="Previous page">← Prev</a>
			{:else}
				<button
					type="button"
					class={controlClass}
					disabled={disabled || pending !== null}
					aria-busy={pending === 'prev'}
					aria-label="Previous page"
					onclick={onprev}
				>
					{#if pending === 'prev'}
						<span
							class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700"
							aria-hidden="true"
						></span>
					{/if}
					← Prev
				</button>
			{/if}
		{/if}

		<span class="text-slate-500">{pageLabel}</span>

		{#if hasNext}
			{#if nextHref}
				<a href={nextHref} class={controlClass} aria-label="Next page">Next →</a>
			{:else}
				<button
					type="button"
					class={controlClass}
					disabled={disabled || pending !== null}
					aria-busy={pending === 'next'}
					aria-label="Next page"
					onclick={onnext}
				>
					{#if pending === 'next'}
						<span
							class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700"
							aria-hidden="true"
						></span>
					{/if}
					Next →
				</button>
			{/if}
		{/if}
	</nav>
{/if}
