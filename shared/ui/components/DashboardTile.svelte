<script lang="ts">
	import DashboardIcon, { type DashboardIconAccent } from './DashboardIcon.svelte';
	import type { Component } from 'svelte';

	let {
		href,
		onclick,
		title,
		description,
		icon: Icon,
		badge,
		secondaryBadge,
		secondaryBadgeBrand = false,
		accent = 'brand',
		large = false
	}: {
		href?: string;
		onclick?: (event: MouseEvent) => void;
		title: string;
		description?: string;
		icon: Component<{ class?: string }>;
		badge?: string;
		secondaryBadge?: string;
		secondaryBadgeBrand?: boolean;
		accent?: DashboardIconAccent;
		large?: boolean;
	} = $props();

	const tileClass = $derived(
		`app-tile h-full ${large ? 'min-h-36 justify-center py-5' : 'justify-start'} ${!href && !onclick ? 'pointer-events-none opacity-60' : ''}`
	);
	const titleClass = $derived(
		`line-clamp-2 w-full font-semibold leading-snug text-slate-900 ${large ? 'text-lg' : 'min-h-[2.25rem] text-sm'}`
	);
	const descriptionClass = $derived(
		`mt-0.5 line-clamp-2 w-full text-xs leading-snug text-slate-500 ${large ? '' : 'min-h-8'}`
	);
	const iconSize = $derived(large ? 'lg' : 'md');
	const hasBadges = $derived(Boolean(badge || secondaryBadge));
</script>

{#snippet tileBody()}
	<DashboardIcon icon={Icon} {accent} size={iconSize} class="mb-2.5" />
	<p class={titleClass}>{title}</p>
	{#if description}
		<p class={descriptionClass}>{description}</p>
	{/if}
	{#if hasBadges}
		<div class="app-tile-badges">
			{#if badge}
				<span class="app-tile-badge">{badge}</span>
			{/if}
			{#if secondaryBadge}
				<span
					class="app-tile-badge {secondaryBadgeBrand ? 'app-tile-badge--brand' : ''}"
				>
					{secondaryBadge}
				</span>
			{/if}
		</div>
	{/if}
{/snippet}

{#if href}
	<a {href} class={tileClass}>
		{@render tileBody()}
	</a>
{:else}
	<button type="button" class={tileClass} {onclick}>
		{@render tileBody()}
	</button>
{/if}
