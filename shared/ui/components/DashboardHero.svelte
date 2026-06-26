<script lang="ts">
	import BuildingIcon from '../icons/BuildingIcon.svelte';
	import type { Snippet } from 'svelte';

	let {
		eyebrow,
		title,
		tag,
		roleLabel,
		roleBadgeClass = '',
		subtitle,
		managingClub = null,
		children
	}: {
		eyebrow?: string;
		title: string;
		tag?: string | null;
		roleLabel?: string;
		roleBadgeClass?: string;
		subtitle?: string;
		managingClub?: { name: string; is_active: boolean } | null;
		children?: Snippet;
	} = $props();
</script>

<div class="app-hero">
	{#if eyebrow}
		<p class="app-hero-eyebrow">{eyebrow}</p>
	{/if}
	<h1 class="app-hero-title">{title}</h1>
	{#if tag || roleLabel}
		<div class="app-hero-badges">
			{#if tag}
				<span class="app-hero-badge font-mono font-semibold">{tag}</span>
			{/if}
			{#if roleLabel}
				<span class="app-hero-badge {roleBadgeClass}">{roleLabel}</span>
			{/if}
		</div>
	{/if}
	{#if managingClub}
		<div class="app-hero-managing-club">
			<span class="app-hero-managing-icon" aria-hidden="true">
				<BuildingIcon class="h-5 w-5" />
			</span>
			<div class="min-w-0 flex-1">
				<p class="app-hero-managing-label">Currently managing</p>
				<p class="app-hero-managing-name truncate">{managingClub.name}</p>
			</div>
			{#if !managingClub.is_active}
				<span class="app-hero-managing-warn">Inactive</span>
			{/if}
		</div>
	{/if}
	{#if subtitle}
		<p class="app-hero-subtitle">{subtitle}</p>
	{/if}
	{#if children}
		<div class="mt-3">
			{@render children()}
		</div>
	{/if}
</div>
