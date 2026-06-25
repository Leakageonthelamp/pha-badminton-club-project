<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import AppLogo from '$lib/components/AppLogo.svelte';
	import BackLink from '$lib/components/BackLink.svelte';
	import { appConfig } from '$lib/config/app';
	import PwaHead from '$lib/components/PwaHead.svelte';
	import PageTransition from '$lib/components/PageTransition.svelte';
	import PwaPrompts from '$lib/components/PwaPrompts.svelte';
	import { getBackHref, shouldShowBack } from '$lib/navigation/back';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const showBack = $derived(shouldShowBack(page.url.pathname));
	const backHref = $derived(getBackHref(page.url.pathname));
	const year = new Date().getFullYear();
</script>

<PwaHead />

<svelte:head>
	<title>{appConfig.name}</title>
	<meta name="apple-mobile-web-app-title" content={appConfig.shortName} />
</svelte:head>

<div class="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-6">
	<header class="mb-8 flex items-center justify-between gap-3">
		{#if showBack}
			<BackLink href={backHref} />
		{:else}
			<a href="/" class="flex min-w-0 items-center gap-3">
				<AppLogo size={36} title={appConfig.name} />
				<span class="truncate text-lg font-semibold text-brand-800">{appConfig.name}</span>
			</a>
		{/if}
		{#if data.session}
			<form method="POST" action="/logout">
				<button
					type="submit"
					class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
				>
					Log out
				</button>
			</form>
		{/if}
	</header>

	<PageTransition>{@render children()}</PageTransition>

	<footer class="mt-auto pt-8 text-center text-xs text-slate-400">
		<p>© {year} {appConfig.name}. All rights reserved.</p>
	</footer>
</div>

<PwaPrompts appName={appConfig.name} />
