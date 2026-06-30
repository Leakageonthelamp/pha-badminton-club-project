<script lang="ts">
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import Pagination from '@repo/ui/components/Pagination.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import SessionListLink from '$lib/components/SessionListLink.svelte';
	import { clubWorkspaceState } from '$lib/clubWorkspace.svelte';
	import { adminRoleHeroBadgeClass } from '$lib/adminRoleHero';
	import { filterSessionsByClub } from '$lib/sessions/list';
	import { appRoleLabel, type AppRole } from '$lib/types/auth';
	import { paginate } from '@repo/ui/pagination';
	import type { LayoutData } from '../../$types';
	import type { PageData } from './$types';

	let { data }: { data: PageData & LayoutData } = $props();

	let listPage = $state(1);

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
	const pagedHistory = $derived(paginate(filteredHistory, listPage));

	$effect(() => {
		selectedClubId;
		data.historySessions;
		listPage = 1;
	});
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
				{#each pagedHistory.items as session (session.id)}
					<SessionListLink
						{session}
						userId={data.userId}
						showClub={data.isSuperAdmin}
						compact
						pendingCancellationFees={data.outstandingCancellationFeesBySession[session.id] ?? 0}
					/>
				{/each}
				<Pagination
					page={pagedHistory.page}
					totalPages={pagedHistory.totalPages}
					hasPrev={pagedHistory.hasPrev}
					hasNext={pagedHistory.hasNext}
					onprev={() => (listPage -= 1)}
					onnext={() => (listPage += 1)}
				/>
			</div>
		{/if}
	</div>
</section>
