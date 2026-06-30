<script lang="ts">
	import { appConfig } from '$lib/config/app';
	import SettingsIcon from '@repo/ui/icons/SettingsIcon.svelte';

	let {
		size = 40,
		title = appConfig.shortName,
		class: className = '',
		tone = 'brand'
	}: {
		size?: number;
		title?: string;
		class?: string;
		tone?: 'brand' | 'white';
	} = $props();

	const colorClass = $derived(tone === 'white' ? 'text-white' : 'text-brand-800');
</script>

<span
	role="img"
	aria-label={title}
	class="inline-flex shrink-0 items-center justify-center {className}"
	style:width="{size}px"
	style:height="{size}px"
>
	<SettingsIcon class="h-full w-full {colorClass}" />
</span>
