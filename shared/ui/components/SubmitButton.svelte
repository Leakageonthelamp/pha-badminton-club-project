<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'ghost';

	type Props = HTMLButtonAttributes & {
		loading?: boolean;
		loadingLabel?: string;
		variant?: Variant;
		class?: string;
		children: Snippet;
	};

	let {
		loading = false,
		loadingLabel = 'Please wait…',
		variant = 'primary',
		class: className = '',
		type = 'submit',
		disabled = false,
		children,
		...rest
	}: Props = $props();

	const variantClasses: Record<Variant, string> = {
		primary:
			'w-full rounded-xl bg-brand-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:opacity-70 disabled:hover:bg-brand-700',
		secondary:
			'flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:opacity-70 disabled:hover:bg-white',
		ghost:
			'rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:opacity-70'
	};
</script>

<button
	{type}
	disabled={disabled || loading}
	class="{variantClasses[variant]} {className}"
	aria-busy={loading}
	{...rest}
>
	{#if loading}
		<span class="inline-flex items-center justify-center gap-2">
			<span
				class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
				aria-hidden="true"
			></span>
			{loadingLabel}
		</span>
	{:else}
		{@render children()}
	{/if}
</button>
