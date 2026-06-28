<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import AppLogo from '$lib/components/AppLogo.svelte';
	import ProfileMenu from '$lib/components/ProfileMenu.svelte';
	import BackLink from '@repo/ui/components/BackLink.svelte';
	import HomeLink from '@repo/ui/components/HomeLink.svelte';
	import PageTransition from '$lib/components/PageTransition.svelte';
	import { appConfig } from '$lib/config/app';
	import { getBackHref, shouldShowBack } from '$lib/navigation/back';
	import { refreshAuthCacheIfNeeded } from '$lib/navigation/authCache';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const showBack = $derived(shouldShowBack(page.url.pathname));
	const backHref = $derived.by(() => {
		const pathname = page.url.pathname;
		if (/^\/sessions\/[^/]+\/live$/.test(pathname)) {
			const session = (page.data as { session?: { status?: string } } | undefined)?.session;
			return getBackHref(pathname, {
				liveSessionStatus: session?.status as
					| 'draft'
					| 'open'
					| 'in_progress'
					| 'closed'
					| 'cancelled'
					| undefined
			});
		}
		return getBackHref(page.url.pathname);
	});

	$effect(() => {
		if (!browser) return;
		refreshAuthCacheIfNeeded();
	});

	$effect(() => {
		if (!browser) return;

		const userId = page.data.user?.id;
		const profileId = data.profile?.id;
		if (userId && profileId && userId !== profileId) {
			void invalidateAll();
		}
	});

	// Refetch profile/clubs when returning to the app so changes made elsewhere
	// (e.g. display name updated in admin-app) show without a manual reload.
	// ponytail: invalidateAll re-runs every load on focus; fine at this scale.
	$effect(() => {
		if (!browser) return;

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
	<div class="flex min-w-0 items-center gap-1">
		{#if showBack}
			<BackLink href={backHref} />
			<HomeLink href="/" />
		{:else}
			<a href="/" class="flex min-w-0 items-center gap-3">
				<AppLogo size={36} title={appConfig.name} />
				<span class="truncate text-lg font-semibold text-brand-800">{appConfig.name}</span>
			</a>
		{/if}
	</div>

	<ProfileMenu profile={data.profile} />
</header>

<PageTransition>{@render children()}</PageTransition>
