<script lang="ts">
	import { pwaInfo } from 'virtual:pwa-info';
</script>

<svelte:head>
	{#if pwaInfo?.webManifest.linkTag}
		{@html pwaInfo.webManifest.linkTag}
	{/if}
</svelte:head>
