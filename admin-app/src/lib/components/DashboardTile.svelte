<script lang="ts">
	import type { Component } from 'svelte';

	let {
		href,
		title,
		description,
		icon: Icon,
		badge,
		large = false
	}: {
		href: string;
		title: string;
		description?: string;
		icon: Component<{ class?: string }>;
		badge?: string;
		large?: boolean;
	} = $props();
</script>

<a
	{href}
	class="group flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-5 text-center shadow-sm ring-1 ring-slate-100 transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-100/50 hover:ring-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 active:translate-y-0 active:shadow-md {large
		? 'min-h-[11rem] py-7'
		: 'min-h-[9.5rem]'}"
>
	<div
		class="mb-4 flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-300/40 transition duration-200 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-brand-400/50 {large
			? 'h-20 w-20'
			: 'h-16 w-16'}"
	>
		<Icon class={large ? 'h-10 w-10' : 'h-8 w-8'} />
	</div>

	<p class="font-semibold text-slate-900 {large ? 'text-lg' : 'text-base'}">{title}</p>

	{#if description}
		<p class="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{description}</p>
	{/if}

	{#if badge}
		<span
			class="mt-3 rounded-full bg-slate-100 px-2.5 py-0.5 text-[0.6875rem] font-medium text-slate-600"
		>
			{badge}
		</span>
	{/if}
</a>
