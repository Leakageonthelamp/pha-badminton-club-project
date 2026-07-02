<script lang="ts">
	import DashboardIcon, { type DashboardIconAccent } from './DashboardIcon.svelte';
	import type { Component, Snippet } from 'svelte';

	let {
		href,
		onclick,
		title,
		description,
		icon: Icon,
		badge,
		durationBadge,
		secondaryBadge,
		secondaryBadgeBrand = false,
		tertiaryBadge,
		tertiaryBadgeBrand = false,
		accent = 'brand',
		large = false,
		loading = false,
		extra
	}: {
		href?: string;
		onclick?: (event: MouseEvent) => void;
		title: string;
		description?: string;
		icon: Component<{ class?: string }>;
		badge?: string;
		durationBadge?: string;
		secondaryBadge?: string;
		secondaryBadgeBrand?: boolean;
		tertiaryBadge?: string;
		tertiaryBadgeBrand?: boolean;
		accent?: DashboardIconAccent;
		large?: boolean;
		loading?: boolean;
		extra?: Snippet;
	} = $props();

	const tileClass = $derived(
		`app-tile h-full ${large ? 'min-h-36 justify-center py-5' : 'justify-start'} ${loading ? 'nav-loading' : ''} ${!href && !onclick ? 'pointer-events-none opacity-60' : ''}`
	);
	const titleClass = $derived(
		`line-clamp-2 w-full font-semibold leading-snug text-slate-900 dark:text-slate-100 ${large ? 'text-lg' : 'min-h-[2.25rem] text-sm'}`
	);
	const descriptionClass = $derived(
		`mt-0.5 line-clamp-2 w-full text-xs leading-snug text-slate-500 dark:text-slate-400 dark:text-slate-500 ${large ? '' : 'min-h-8'}`
	);
	const iconSize = $derived(large ? 'lg' : 'md');
	const hasBadges = $derived(
		Boolean(badge || durationBadge || secondaryBadge || tertiaryBadge)
	);
</script>

{#snippet tileBody()}
	<DashboardIcon icon={Icon} {accent} size={iconSize} class="mb-2.5" />
	<p class={titleClass}>{title}</p>
	{#if description}
		<p class={descriptionClass}>{description}</p>
	{/if}
	{#if extra}
		{@render extra()}
	{/if}
	{#if hasBadges}
		<div class="app-tile-badges">
			{#if badge}
				<span class="app-tile-badge">{badge}</span>
			{/if}
			{#if durationBadge}
				<span class="app-tile-badge">{durationBadge}</span>
			{/if}
			{#if secondaryBadge}
				<span
					class="app-tile-badge {secondaryBadgeBrand ? 'app-tile-badge--brand' : ''}"
				>
					{secondaryBadge}
				</span>
			{/if}
			{#if tertiaryBadge}
				<span
					class="app-tile-badge {tertiaryBadgeBrand ? 'app-tile-badge--brand' : ''}"
				>
					{tertiaryBadge}
				</span>
			{/if}
		</div>
	{/if}
{/snippet}

{#if href}
	<a {href} class={tileClass} aria-busy={loading || undefined}>
		{@render tileBody()}
	</a>
{:else}
	<button type="button" class={tileClass} {onclick} aria-busy={loading || undefined} disabled={loading}>
		{@render tileBody()}
	</button>
{/if}
