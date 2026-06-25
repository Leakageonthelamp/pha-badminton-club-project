<script lang="ts">
	import '../app.css';
	import { appConfig } from '$lib/config/app';
	import PwaHead from '$lib/components/PwaHead.svelte';
	import PwaPrompts from '$lib/components/PwaPrompts.svelte';

	let { children }: { children: import('svelte').Snippet } = $props();

	const year = new Date().getFullYear();
</script>

<PwaHead />

<svelte:head>
	<title>{appConfig.name}</title>
	<meta name="apple-mobile-web-app-title" content={appConfig.shortName} />
</svelte:head>

<div class="app-shell mx-auto flex h-full w-full max-w-lg flex-col">
	<div class="app-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pt-6">
		{@render children()}
	</div>

	<footer class="app-footer shrink-0 px-4 text-center text-[10px] leading-tight text-slate-400">
		<p>© {year} {appConfig.name}</p>
	</footer>
</div>

<PwaPrompts appName={appConfig.name} />
