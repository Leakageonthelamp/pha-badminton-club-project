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
		`app-tile h-full ${large ? 'min-h-36 justify-center py-5' : 'justify-start'} ${!href && !onclick ? 'pointer-events-none opacity-60' : ''}`
	);
	const iconWrapClass = $derived(`app-tile-icon ${large ? 'h-16 w-16' : 'h-12 w-12'}`);
	const iconClass = $derived(large ? 'h-8 w-8' : 'h-6 w-6');
	const titleClass = $derived(
		`line-clamp-2 w-full font-semibold leading-snug text-slate-900 ${large ? 'text-lg' : 'min-h-[2.25rem] text-sm'}`
	);
	const descriptionClass = $derived(
		`mt-0.5 line-clamp-2 w-full text-xs leading-snug text-slate-500 ${large ? '' : 'min-h-8'}`
	);
</script>

{#if href}
	<a {href} class={tileClass}>
		<div class={iconWrapClass}>
			<Icon class={iconClass} />
		</div>
		<p class={titleClass}>{title}</p>
		{#if description}
			<p class={descriptionClass}>{description}</p>
		{/if}
		{#if badge}
			<span class="mt-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-[0.6875rem] font-medium text-slate-600">
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
			<p class={descriptionClass}>{description}</p>
		{/if}
		{#if badge}
			<span class="mt-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-[0.6875rem] font-medium text-slate-600">
				{badge}
			</span>
		{/if}
	</button>
{/if}
