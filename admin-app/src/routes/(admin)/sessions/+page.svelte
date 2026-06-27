<script lang="ts">
	import ActionRowLink from '@repo/ui/components/ActionRowLink.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import UpcomingSessionsPanel from '$lib/components/UpcomingSessionsPanel.svelte';
	import LayersIcon from '@repo/ui/icons/LayersIcon.svelte';
	import PlusIcon from '@repo/ui/icons/PlusIcon.svelte';
	import { clubWorkspaceState } from '$lib/clubWorkspace.svelte';
	import { adminRoleHeroBadgeClass } from '$lib/adminRoleHero';
	import { filterSessionsByClub } from '$lib/sessions/list';
	import { appRoleLabel, type AppRole } from '$lib/types/auth';
	import type { LayoutData } from '../$types';
	import type { PageData } from './$types';

	let { data }: { data: PageData & LayoutData } = $props();

	const effectiveAppRole = $derived(data.effectiveAppRole ?? null);
	const roleLabel = $derived(
		effectiveAppRole ? appRoleLabel(effectiveAppRole as AppRole) : ''
	);
	const roleBadgeClass = $derived(adminRoleHeroBadgeClass(effectiveAppRole));
	const canCreate = $derived(effectiveAppRole === 'club_admin');
	const selectedClubId = $derived(clubWorkspaceState.selectedClubId);
	const filteredUpcoming = $derived(
		data.isSuperAdmin
			? data.upcomingSessions
			: filterSessionsByClub(data.upcomingSessions, selectedClubId)
	);
</script>

<section class="space-y-6">
	<DashboardHero
		eyebrow="Sessions"
		title={data.profile?.display_name ?? 'Sessions'}
		tag={data.profile?.tag}
		roleLabel={roleLabel}
		roleBadgeClass={roleBadgeClass}
		subtitle={data.isSuperAdmin
			? 'All upcoming sessions across clubs you manage.'
			: 'Upcoming and past sessions for your club.'}
	/>

	<div class="space-y-3">
		<SectionHeading title="Quick actions" />
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			{#if canCreate}
				<ActionRowLink
					href="/sessions/new"
					title="Create session"
					description="Schedule a new badminton session"
					icon={PlusIcon}
					accent="violet"
				/>
			{/if}
			<ActionRowLink
				href="/sessions/history"
				title="Session history"
				description="Closed and cancelled sessions"
				icon={LayersIcon}
				accent="indigo"
			/>
		</div>
	</div>

	<UpcomingSessionsPanel
		sessions={filteredUpcoming}
		userId={data.userId}
		showClub={data.isSuperAdmin}
		viewAllHref={undefined}
	/>
</section>
