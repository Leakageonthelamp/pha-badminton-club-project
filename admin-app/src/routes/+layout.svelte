<script lang="ts">
	import '../app.css';
	import { appConfig } from '$lib/config/app';
	import ServiceUnavailable from '$lib/components/ServiceUnavailable.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const year = new Date().getFullYear();
</script>

<svelte:head>
	<title>{appConfig.name}</title>
	<meta name="apple-mobile-web-app-title" content={appConfig.shortName} />
</svelte:head>

<div class="app-shell relative mx-auto flex h-full w-full max-w-lg flex-col">
	<div class="app-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pt-6">
		{#if data.serviceUnavailable}
			<ServiceUnavailable />
		{:else}
			{@render children()}
		{/if}
	</div>

	<footer class="app-footer shrink-0 px-4 text-center text-[10px] leading-tight text-slate-400">
		<p>© {year} {appConfig.name}</p>
	</footer>

	<ToastContainer />
</div>
