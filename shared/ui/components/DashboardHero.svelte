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
		footerCenter = false,
		children
	}: {
		eyebrow?: string;
		title: string;
		tag?: string | null;
		roleLabel?: string;
		roleBadgeClass?: string;
		subtitle?: string;
		managingClub?: { name: string; is_active: boolean } | null;
		footerCenter?: boolean;
		children?: Snippet;
	} = $props();
</script>

<div class="app-hero">
	<div class="app-hero-grid" aria-hidden="true"></div>
	<div class="app-hero-glow" aria-hidden="true"></div>
	<div class="app-hero-shine" aria-hidden="true"></div>

	<div class="app-hero-inner">
		{#if eyebrow}
			<p class="app-hero-eyebrow">
				<span class="app-hero-eyebrow-dot" aria-hidden="true"></span>
				{eyebrow}
			</p>
		{/if}

		<h1 class="app-hero-title">{title}</h1>

		{#if tag || roleLabel}
			<div class="app-hero-badges">
				{#if tag}
					<span class="app-hero-badge app-hero-badge--tag font-mono font-semibold">{tag}</span>
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
			<div class="app-hero-footer" class:app-hero-footer--center={footerCenter}>
				{@render children()}
			</div>
		{/if}
	</div>
</div>
