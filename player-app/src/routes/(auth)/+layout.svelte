<script lang="ts">
	import { page } from '$app/state';
	import AppLogo from '$lib/components/AppLogo.svelte';
	import BackLink from '$lib/components/BackLink.svelte';
	import PageTransition from '$lib/components/PageTransition.svelte';
	import { appConfig } from '$lib/config/app';
	import { getBackHref, shouldShowBack } from '$lib/navigation/back';

	let { children }: { children: import('svelte').Snippet } = $props();

	const showBack = $derived(shouldShowBack(page.url.pathname));
	const backHref = $derived(getBackHref(page.url.pathname));
</script>

<header class="mb-8 flex items-center justify-between gap-3">
	{#if showBack}
		<BackLink href={backHref} />
	{:else}
		<a href="/login" class="flex min-w-0 items-center gap-3">
			<AppLogo size={36} title={appConfig.name} />
			<span class="truncate text-lg font-semibold text-brand-800">{appConfig.name}</span>
		</a>
	{/if}
</header>

<PageTransition>{@render children()}</PageTransition>
