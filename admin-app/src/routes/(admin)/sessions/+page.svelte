<script lang="ts">
	import ActionRowLink from '@repo/ui/components/ActionRowLink.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import SessionListLink from '$lib/components/SessionListLink.svelte';
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
	const filteredSessions = $derived(
		data.isSuperAdmin
			? data.sessions
			: filterSessionsByClub(data.sessions, selectedClubId)
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
			? 'All active sessions across clubs you manage.'
			: 'Draft, open, and in-progress sessions for your club.'}
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

	<div class="space-y-4">
		<SectionHeading title="All sessions" />
		{#if filteredSessions.length === 0}
			<EmptyState message="No active sessions for this club." />
		{:else}
			<div class="space-y-3">
				{#each filteredSessions as session (session.id)}
					<SessionListLink {session} userId={data.userId} showClub={data.isSuperAdmin} />
				{/each}
			</div>
		{/if}
	</div>
</section>
