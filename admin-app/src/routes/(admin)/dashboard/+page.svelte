<script lang="ts">
	import ActionRowLink from '@repo/ui/components/ActionRowLink.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import DashboardTile from '@repo/ui/components/DashboardTile.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import UpcomingSessionsPanel from '$lib/components/UpcomingSessionsPanel.svelte';
	import LayersIcon from '@repo/ui/icons/LayersIcon.svelte';
	import PlusIcon from '@repo/ui/icons/PlusIcon.svelte';
	import SettingsIcon from '@repo/ui/icons/SettingsIcon.svelte';
	import { adminRoleHeroBadgeClass } from '$lib/adminRoleHero';
	import { clubWorkspaceState } from '$lib/clubWorkspace.svelte';
	import { filterOngoingSessions, filterSessionsByClub, filterUpcomingSessions } from '$lib/sessions/list';
	import { appRoleLabel, type AppRole } from '$lib/types/auth';
	import type { LayoutData } from '../$types';
	import type { PageData } from './$types';

	let { data }: { data: PageData & LayoutData } = $props();

	const clubs = $derived(data.managedClubs ?? []);
	const activeClub = $derived(
		clubs.find((club) => club.id === clubWorkspaceState.selectedClubId) ?? clubs[0] ?? null
	);
	const effectiveAppRole = $derived(data.effectiveAppRole ?? null);
	const roleLabel = $derived(
		effectiveAppRole ? appRoleLabel(effectiveAppRole as AppRole) : ''
	);
	const roleBadgeClass = $derived(adminRoleHeroBadgeClass(effectiveAppRole));
	const upcomingSessions = $derived(
		activeClub
			? filterSessionsByClub(data.upcomingSessions, activeClub.id)
			: data.upcomingSessions
	);
	const ongoingSessions = $derived(
		activeClub
			? filterOngoingSessions(filterSessionsByClub(data.sessions ?? [], activeClub.id))
			: filterOngoingSessions(data.sessions ?? [])
	);
</script>

<section class="space-y-6">
	<DashboardHero
		eyebrow="Welcome back"
		title={data.profileName}
		tag={data.profile?.tag}
		roleLabel={roleLabel}
		roleBadgeClass={roleBadgeClass}
		managingClub={activeClub
			? { name: activeClub.name, is_active: activeClub.is_active }
			: null}
	/>

	{#if clubs.length === 0}
		<EmptyState message="No clubs assigned to you yet." />
	{:else if activeClub}
		{#if data.canCreate}
			<div class="space-y-3">
				<SectionHeading title="Quick actions" />
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
					<DashboardTile
						href="/sessions/new"
						title="Create session"
						description="Schedule a new badminton session"
						icon={PlusIcon}
						accent="violet"
					/>
				</div>
			</div>
		{/if}

		<UpcomingSessionsPanel
			sessions={ongoingSessions}
			userId={data.userId}
			limit={5}
			viewAllHref="/sessions"
			eyebrow="Ongoing sessions"
			title={ongoingSessions.length === 0
				? 'Nothing in progress'
				: `${ongoingSessions.length} session${ongoingSessions.length === 1 ? '' : 's'} live now`}
			subtitle="Sessions currently in progress — tap to manage."
			emptyMessage="No sessions in progress right now."
		/>

		<UpcomingSessionsPanel
			sessions={upcomingSessions}
			userId={data.userId}
			limit={5}
			viewAllHref="/sessions"
		/>

		<div class="space-y-3">
			<SectionHeading title="Menu" />
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<ActionRowLink
					href="/clubs/{activeClub.id}"
					title="Club settings"
					description="Shuttles, PromptPay, venue & location"
					icon={SettingsIcon}
				/>
				<ActionRowLink
					href="/sessions"
					title="Sessions"
					description="Manage upcoming sessions and history"
					icon={LayersIcon}
					accent="violet"
				/>
			</div>
		</div>
	{/if}
</section>
