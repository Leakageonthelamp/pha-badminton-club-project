<script lang="ts">
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import SessionListLink from '$lib/components/SessionListLink.svelte';
	import { clubWorkspaceState } from '$lib/clubWorkspace.svelte';
	import { adminRoleHeroBadgeClass } from '$lib/adminRoleHero';
	import { filterSessionsByClub } from '$lib/sessions/list';
	import { appRoleLabel, type AppRole } from '$lib/types/auth';
	import type { LayoutData } from '../../$types';
	import type { PageData } from './$types';

	let { data }: { data: PageData & LayoutData } = $props();

	const effectiveAppRole = $derived(data.effectiveAppRole ?? null);
	const roleLabel = $derived(
		effectiveAppRole ? appRoleLabel(effectiveAppRole as AppRole) : ''
	);
	const roleBadgeClass = $derived(adminRoleHeroBadgeClass(effectiveAppRole));
	const selectedClubId = $derived(clubWorkspaceState.selectedClubId);
	const filteredHistory = $derived(
		data.isSuperAdmin
			? data.historySessions
			: filterSessionsByClub(data.historySessions, selectedClubId)
	);
</script>

<section class="space-y-6">
	<DashboardHero
		eyebrow="Sessions"
		title="Session history"
		tag={data.profile?.tag}
		roleLabel={roleLabel}
		roleBadgeClass={roleBadgeClass}
		subtitle="Closed and cancelled sessions for your club."
	/>

	<div class="space-y-4">
		<SectionHeading title="Past sessions" />
		{#if filteredHistory.length === 0}
			<EmptyState message="No closed or cancelled sessions yet." />
		{:else}
			<div class="space-y-3">
				{#each filteredHistory as session (session.id)}
					<SessionListLink
						{session}
						userId={data.userId}
						showClub={data.isSuperAdmin}
						compact
						pendingCancellationFees={data.outstandingCancellationFeesBySession[session.id] ?? 0}
					/>
				{/each}
			</div>
		{/if}
	</div>
</section>
