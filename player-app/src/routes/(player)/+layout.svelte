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
	import { attachVisibilityRevalidate } from '@repo/ui/visibilityRevalidate';
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

	// Refetch when returning after a long absence (e.g. profile edited in admin-app).
	// ponytail: 30s threshold skips invalidateAll on quick tab flips.
	$effect(() => {
		if (!browser) return;
		return attachVisibilityRevalidate(() => void invalidateAll());
	});
</script>

<header class="app-topbar relative z-30 mb-6 overflow-visible">
	<div class="flex min-w-0 items-center gap-0.5">
		{#if showBack}
			<BackLink href={backHref} />
			<HomeLink href="/" />
		{:else}
			<a href="/" class="app-topbar-brand">
				<span class="app-topbar-mark">
					<AppLogo size={32} title={appConfig.name} />
				</span>
				<span class="app-topbar-title">{appConfig.name}</span>
			</a>
		{/if}
	</div>

	<ProfileMenu profile={data.profile} />
</header>

<PageTransition>{@render children()}</PageTransition>
