<script lang="ts">
	type Size = 'sm' | 'md';
	type Accent = 'brand' | 'secondary';

	let {
		tag,
		size = 'sm',
		accent = 'brand',
		class: className = ''
	}: {
		tag: string;
		size?: Size;
		accent?: Accent;
		class?: string;
	} = $props();

	const sizeClass = $derived(size === 'md' ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-xs');
	const accentClass = $derived(
		accent === 'secondary'
			? 'bg-secondary-100 text-secondary-900 ring-secondary-300/80 dark:bg-secondary-900/40 dark:text-secondary-300 dark:ring-secondary-700/80'
			: 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200 ring-brand-200/80 dark:ring-brand-700/80'
	);
</script>

<span
	class="inline-flex max-w-full items-center truncate rounded-full font-mono font-semibold ring-1 {accentClass} {sizeClass} {className}"
	title={tag}
>
	{tag}
</span>
