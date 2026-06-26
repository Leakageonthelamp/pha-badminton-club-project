<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import AppLogo from '$lib/components/AppLogo.svelte';
	import ProfileMenu from '$lib/components/ProfileMenu.svelte';
	import BackLink from '@repo/ui/components/BackLink.svelte';
	import PageTransition from '$lib/components/PageTransition.svelte';
	import { appConfig } from '$lib/config/app';
	import { getBackHref, shouldShowBack } from '$lib/navigation/back';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const showBack = $derived(shouldShowBack(page.url.pathname));
	const backHref = $derived(getBackHref(page.url.pathname));

	// Refetch profile/clubs when returning to the app so changes made elsewhere
	// (e.g. display name updated in admin-app) show without a manual reload.
	// ponytail: invalidateAll re-runs every load on focus; fine at this scale.
	$effect(() => {
		const revalidate = () => {
			if (document.visibilityState === 'visible') invalidateAll();
		};
		document.addEventListener('visibilitychange', revalidate);
		window.addEventListener('focus', revalidate);
		return () => {
			document.removeEventListener('visibilitychange', revalidate);
			window.removeEventListener('focus', revalidate);
		};
	});
</script>

<header class="relative z-30 mb-8 flex items-center justify-between gap-3 overflow-visible">
	{#if showBack}
		<BackLink href={backHref} />
	{:else}
		<a href="/" class="flex min-w-0 items-center gap-3">
			<AppLogo size={36} title={appConfig.name} />
			<span class="truncate text-lg font-semibold text-brand-800">{appConfig.name}</span>
		</a>
	{/if}

	<ProfileMenu profile={data.profile} />
</header>

<PageTransition>{@render children()}</PageTransition>
