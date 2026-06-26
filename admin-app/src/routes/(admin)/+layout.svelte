<script lang="ts">
	import { page } from '$app/state';
	import AppLogo from '$lib/components/AppLogo.svelte';
	import ProfileMenu from '$lib/components/ProfileMenu.svelte';
	import BackLink from '$lib/components/BackLink.svelte';
	import PageTransition from '$lib/components/PageTransition.svelte';
	import { appConfig } from '$lib/config/app';
	import { getBackHref, getHomePath, shouldShowBack } from '$lib/navigation/back';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const appRole = $derived(data.profile?.app_role ?? null);
	const showBack = $derived(shouldShowBack(page.url.pathname, appRole));
	const backHref = $derived(getBackHref(page.url.pathname, appRole));
	const homeHref = $derived(getHomePath(appRole));
</script>

<header class="relative z-30 mb-8 flex items-center justify-between gap-3 overflow-visible">
	{#if showBack}
		<BackLink href={backHref} />
	{:else}
		<a href={homeHref} class="flex min-w-0 items-center gap-3">
			<AppLogo size={36} title={appConfig.name} />
			<span class="truncate text-lg font-semibold text-brand-800">{appConfig.name}</span>
		</a>
	{/if}

	<ProfileMenu profile={data.profile} />
</header>

<PageTransition appRole={appRole}>{@render children()}</PageTransition>
