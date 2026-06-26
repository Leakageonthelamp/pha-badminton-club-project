<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		eyebrow,
		title,
		tag,
		subtitle,
		children
	}: {
		eyebrow?: string;
		title: string;
		tag?: string | null;
		subtitle?: string;
		children?: Snippet;
	} = $props();
</script>

<div class="app-hero">
	{#if eyebrow}
		<p class="app-hero-eyebrow">{eyebrow}</p>
	{/if}
	<h1 class="app-hero-title">{title}</h1>
	{#if tag}
		<span class="app-hero-badge font-mono font-semibold">{tag}</span>
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
