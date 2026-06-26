<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import AdminWorkspaceSwitch from '$lib/components/AdminWorkspaceSwitch.svelte';
	import AppLogo from '$lib/components/AppLogo.svelte';
	import ProfileMenu from '$lib/components/ProfileMenu.svelte';
	import BackLink from '@repo/ui/components/BackLink.svelte';
	import PageTransition from '$lib/components/PageTransition.svelte';
	import { appConfig } from '$lib/config/app';
	import { getBackHref, getHomePath, shouldShowBack } from '$lib/navigation/back';
	import { refreshAuthCacheIfNeeded } from '$lib/navigation/authCache';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const appRole = $derived(data.profile?.app_role ?? null);
	const dashboardMode = $derived(data.dashboardMode ?? 'super');
	const hasClubMembership = $derived(data.hasClubMembership ?? false);
	const showBack = $derived(
		shouldShowBack(page.url.pathname, appRole, dashboardMode, hasClubMembership)
	);
	const backHref = $derived(
		getBackHref(page.url.pathname, appRole, dashboardMode, hasClubMembership)
	);
	const homeHref = $derived(getHomePath(appRole, dashboardMode, hasClubMembership));

	$effect(() => {
		if (!browser) return;
		refreshAuthCacheIfNeeded();
	});

	$effect(() => {
		const userId = page.data.user?.id;
		const profileId = data.profile?.id;
		if (userId && profileId && userId !== profileId) {
			void invalidateAll();
		}
	});

	// Refetch profile/clubs when returning to the app so changes made elsewhere
	// show without a manual reload.
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
		<a href={homeHref} class="flex min-w-0 items-center gap-3">
			<AppLogo size={36} title={appConfig.name} />
			<span class="truncate text-lg font-semibold text-brand-800">{appConfig.name}</span>
		</a>
	{/if}

	<div class="flex shrink-0 items-center gap-2">
		<AdminWorkspaceSwitch
			options={data.workspaceOptions ?? []}
			currentWorkspace={data.dashboardMode ?? 'super'}
			canSwitch={data.canSwitchWorkspace ?? false}
		/>
		<ProfileMenu profile={data.profile} />
	</div>
</header>

<PageTransition
	appRole={data.effectiveAppRole ?? appRole}
	dashboardMode={dashboardMode}
	hasClubMembership={hasClubMembership}
>
	{@render children()}
</PageTransition>
