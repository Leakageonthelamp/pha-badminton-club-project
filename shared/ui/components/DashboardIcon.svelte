<script lang="ts">
	import type { Component } from 'svelte';

	export type DashboardIconAccent = 'brand' | 'violet' | 'indigo' | 'secondary';
	export type DashboardIconSize = 'md' | 'lg';

	let {
		icon: Icon,
		size = 'md',
		accent = 'brand',
		class: className = ''
	}: {
		icon: Component<{ class?: string }>;
		size?: DashboardIconSize;
		accent?: DashboardIconAccent;
		class?: string;
	} = $props();

	const wrapClass = $derived(
		`app-dashboard-icon app-dashboard-icon--${size} app-dashboard-icon--${accent} ${className}`.trim()
	);
	const iconClass = $derived(size === 'lg' ? 'h-8 w-8' : 'h-6 w-6');
</script>

<div class={wrapClass}>
	<Icon class={iconClass} />
</div>
