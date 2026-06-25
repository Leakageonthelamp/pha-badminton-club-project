<script lang="ts">
	import { onMount } from 'svelte';
	import { pwaInfo } from 'virtual:pwa-info';

	let manifestTag = $state('');

	onMount(() => {
		if (pwaInfo?.webManifest.linkTag) {
			manifestTag = pwaInfo.webManifest.linkTag;
		}
	});
</script>

{#if manifestTag}
	{@html manifestTag}
{/if}
