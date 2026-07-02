<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import AdminWorkspaceSwitch from '$lib/components/AdminWorkspaceSwitch.svelte';
	import ClubWorkspaceSwitch from '$lib/components/ClubWorkspaceSwitch.svelte';
	import AppLogo from '$lib/components/AppLogo.svelte';
	import ProfileMenu from '$lib/components/ProfileMenu.svelte';
	import BackLink from '@repo/ui/components/BackLink.svelte';
	import HomeLink from '@repo/ui/components/HomeLink.svelte';
	import LocalePicker from '@repo/ui/components/LocalePicker.svelte';
	import PageTransition from '$lib/components/PageTransition.svelte';
	import { syncSelectedClub, selectClub } from '$lib/clubWorkspace.svelte';
	import { appConfig } from '$lib/config/app';
	import { getBackHref, getHomePath, shouldShowBack } from '$lib/navigation/back';
	import { refreshAuthCacheIfNeeded } from '$lib/navigation/authCache';
	import { attachVisibilityRevalidate } from '@repo/ui/visibilityRevalidate';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const appRole = $derived(data.profile?.app_role ?? null);
	const dashboardMode = $derived(data.dashboardMode ?? 'super');
	const hasClubMembership = $derived(data.hasClubMembership ?? false);
	const showBack = $derived(
		shouldShowBack(page.url.pathname, appRole, dashboardMode, hasClubMembership)
	);
	const backHref = $derived(
		getBackHref(page.url.pathname, appRole, dashboardMode, hasClubMembership, {
			isHistorySessionDetail: page.data.isHistoryView === true
		})
	);
	const homeHref = $derived(getHomePath(appRole, dashboardMode, hasClubMembership));
	const clubWorkspaceOptions = $derived(
		(data.managedClubs ?? []).map((club) => ({
			id: club.id,
			name: club.name,
			is_active: club.is_active
		}))
	);

	$effect(() => {
		const clubs = clubWorkspaceOptions;
		const match = page.url.pathname.match(/^\/clubs\/([^/]+)/);
		const pathClubId = match?.[1];

		if (pathClubId && clubs.some((club) => club.id === pathClubId)) {
			selectClub(pathClubId);
			return;
		}

		syncSelectedClub(clubs);
	});

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

	// Refetch when returning after a long absence (e.g. profile edited in player-app).
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
			<HomeLink href={homeHref} />
		{:else}
			<a href={homeHref} class="app-topbar-brand">
				<span class="app-topbar-mark">
					<AppLogo size={32} title={appConfig.name} />
				</span>
				<span class="app-topbar-title">{appConfig.name}</span>
			</a>
		{/if}
	</div>

	<div class="flex shrink-0 items-center gap-2">
		{#if clubWorkspaceOptions.length > 0}
			<ClubWorkspaceSwitch clubs={clubWorkspaceOptions} />
		{/if}
		<AdminWorkspaceSwitch
			options={data.workspaceOptions ?? []}
			currentWorkspace={data.dashboardMode ?? 'super'}
			canSwitch={data.canSwitchWorkspace ?? false}
		/>
		<LocalePicker />
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
