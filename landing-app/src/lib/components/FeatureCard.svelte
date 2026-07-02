<script lang="ts">
	import type { Component } from 'svelte';

	let {
		title,
		description,
		icon: Icon,
		accent = 'brand'
	}: {
		title: string;
		description: string;
		icon: Component<{ class?: string }>;
		accent?: 'brand' | 'violet' | 'indigo' | 'sky' | 'secondary';
	} = $props();

	const accentClasses = {
		brand: 'from-brand-500 to-brand-700 shadow-brand-600/20',
		violet: 'from-violet-500 to-brand-700 shadow-violet-600/20',
		indigo: 'from-indigo-500 to-indigo-700 shadow-indigo-600/20',
		sky: 'from-sky-500 to-cyan-600 shadow-sky-600/20',
		secondary: 'from-secondary-400 to-secondary-600 text-secondary-900 shadow-secondary-500/25'
	} as const;
</script>

<article
	class="group rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-md transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-100/50"
>
	<div
		class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br {accentClasses[
			accent
		]} text-white shadow-lg transition group-hover:scale-105"
	>
		<Icon class="h-7 w-7" />
	</div>
	<h3 class="text-lg font-semibold text-slate-900">{title}</h3>
	<p class="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
</article>
