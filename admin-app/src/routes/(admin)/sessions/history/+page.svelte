<script lang="ts">
	import { t } from '$lib/i18n';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import Pagination from '@repo/ui/components/Pagination.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import SessionListLink from '$lib/components/SessionListLink.svelte';
	import { clubWorkspaceState } from '$lib/clubWorkspace.svelte';
	import { adminRoleHeroBadgeClass } from '$lib/adminRoleHero';
	import { filterSessionsByClub, summarizeAdminSessionHistory } from '$lib/sessions/list';
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
	const summary = $derived(summarizeAdminSessionHistory(filteredHistory));
	const outstandingFees = $derived(
		filteredHistory.reduce(
			(sum, session) => sum + (data.outstandingCancellationFeesBySession[session.id] ?? 0),
			0
		)
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
		eyebrow={t('dashboard.super.sessions.title')}
		title={t('dashboard.club.history.title')}
		tag={data.profile?.tag}
		roleLabel={roleLabel}
		roleBadgeClass={roleBadgeClass}
		subtitle={t('sessions.history.subtitle')}
	/>

	{#if filteredHistory.length > 0}
		<dl class="grid grid-cols-2 gap-3">
			<div class="app-history-stat">
				<dt class="app-history-stat-label">{t('sessions.history.pastSessions')}</dt>
				<dd class="app-history-stat-value">{summary.total}</dd>
			</div>
			<div class="app-history-stat">
				<dt class="app-history-stat-label">{t('session.status.closed')}</dt>
				<dd class="app-history-stat-value">{summary.closed}</dd>
			</div>
			<div class="app-history-stat">
				<dt class="app-history-stat-label">{t('session.status.cancelled')}</dt>
				<dd class="app-history-stat-value">{summary.cancelled}</dd>
			</div>
			<div class="app-history-stat">
				<dt class="app-history-stat-label">{t('transactions.unpaid')}</dt>
				<dd class="app-history-stat-value">{outstandingFees}</dd>
			</div>
		</dl>
	{/if}

	<div class="space-y-4">
		<SectionHeading title={t('sessions.history.pastSessions')} />
		{#if filteredHistory.length === 0}
			<EmptyState message={t('sessions.history.empty')} />
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
