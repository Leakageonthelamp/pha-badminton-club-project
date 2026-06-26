<script lang="ts">
	import type { Component } from 'svelte';

	let {
		href,
		onclick,
		title,
		description,
		icon: Icon,
		badge,
		large = false
	}: {
		href?: string;
		onclick?: (event: MouseEvent) => void;
		title: string;
		description?: string;
		icon: Component<{ class?: string }>;
		badge?: string;
		large?: boolean;
	} = $props();

	const tileClass = $derived(
		`app-tile ${large ? 'min-h-44 py-7' : 'min-h-[9.5rem]'} ${!href && !onclick ? 'pointer-events-none opacity-60' : ''}`
	);
	const iconWrapClass = $derived(`app-tile-icon ${large ? 'h-20 w-20' : 'h-16 w-16'}`);
	const iconClass = $derived(large ? 'h-10 w-10' : 'h-8 w-8');
	const titleClass = $derived(`font-semibold text-slate-900 ${large ? 'text-lg' : 'text-base'}`);
</script>

{#if href}
	<a {href} class={tileClass}>
		<div class={iconWrapClass}>
			<Icon class={iconClass} />
		</div>
		<p class={titleClass}>{title}</p>
		{#if description}
			<p class="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{description}</p>
		{/if}
		{#if badge}
			<span class="mt-3 rounded-full bg-slate-100 px-2.5 py-0.5 text-[0.6875rem] font-medium text-slate-600">
				{badge}
			</span>
		{/if}
	</a>
{:else}
	<button type="button" class={tileClass} {onclick}>
		<div class={iconWrapClass}>
			<Icon class={iconClass} />
		</div>
		<p class={titleClass}>{title}</p>
		{#if description}
			<p class="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{description}</p>
		{/if}
		{#if badge}
			<span class="mt-3 rounded-full bg-slate-100 px-2.5 py-0.5 text-[0.6875rem] font-medium text-slate-600">
				{badge}
			</span>
		{/if}
	</button>
{/if}
