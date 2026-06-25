<script lang="ts">
	type Size = 'sm' | 'md';

	let {
		tag,
		size = 'sm',
		class: className = ''
	}: {
		tag: string;
		size?: Size;
		class?: string;
	} = $props();

	const sizeClass = $derived(size === 'md' ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-xs');
</script>

<span
	class="inline-flex max-w-full items-center truncate rounded-full bg-brand-100 font-mono font-semibold text-brand-800 ring-1 ring-brand-200/80 {sizeClass} {className}"
	title={tag}
>
	{tag}
</span>
