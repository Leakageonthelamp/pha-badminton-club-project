<script lang="ts">
	import DashboardIcon, {
		type DashboardIconAccent
	} from './DashboardIcon.svelte';
	import type { Component } from 'svelte';

	let {
		href,
		title,
		description,
		icon,
		accent = 'brand'
	}: {
		href: string;
		title: string;
		description?: string;
		icon: Component<{ class?: string }>;
		accent?: DashboardIconAccent;
	} = $props();
</script>

<a href={href} class="app-action-row group">
	<DashboardIcon icon={icon} accent={accent} />
	<div class="min-w-0 flex-1">
		<p class="font-semibold text-slate-900 dark:text-slate-100">{title}</p>
		{#if description}
			<p class="text-sm leading-snug text-slate-500 dark:text-slate-400 dark:text-slate-500">{description}</p>
		{/if}
	</div>
	<span class="app-action-row-arrow" aria-hidden="true">→</span>
</a>
