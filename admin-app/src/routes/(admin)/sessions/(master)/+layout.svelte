<script lang="ts">
	import { t } from '$lib/i18n';
	import { page } from '$app/state';
	import ActionRowLink from '@repo/ui/components/ActionRowLink.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import Pagination from '@repo/ui/components/Pagination.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import SessionListLink from '$lib/components/SessionListLink.svelte';
	import ClockIcon from '@repo/ui/icons/ClockIcon.svelte';
	import PlusIcon from '@repo/ui/icons/PlusIcon.svelte';
	import { clubWorkspaceState } from '$lib/clubWorkspace.svelte';
	import { adminRoleHeroBadgeClass } from '$lib/adminRoleHero';
	import { filterSessionsByClub, summarizeAdminSessions } from '$lib/sessions/list';
	import { paginate } from '@repo/ui/pagination';
	import { appRoleLabel, type AppRole } from '$lib/types/auth';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	let listPage = $state(1);

	const hasDetail = $derived(
		/^\/sessions\/[^/]+$/.test(page.url.pathname) &&
			page.url.pathname !== '/sessions/new' &&
			page.url.pathname !== '/sessions/history'
	);

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
	const summary = $derived(summarizeAdminSessions(filteredSessions));
	const pagedSessions = $derived(paginate(filteredSessions, listPage));

	$effect(() => {
		selectedClubId;
		data.sessions;
		listPage = 1;
	});
</script>

<div class="lg:flex lg:items-start lg:gap-6">
	<section class="min-w-0 space-y-6 {hasDetail ? 'hidden lg:block lg:w-80 lg:shrink-0' : 'w-full'}">
		<DashboardHero
			eyebrow={t('dashboard.super.sessions.title')}
			title={data.profile?.display_name ?? t('dashboard.super.sessions.title')}
			tag={data.profile?.tag}
			roleLabel={roleLabel}
			roleBadgeClass={roleBadgeClass}
			subtitle={data.isSuperAdmin
				? t('dashboard.super.sessions.description')
				: t('sessions.list.subtitle')}
		/>

		<div class="space-y-3">
			<SectionHeading title={t('dashboard.club.menu')} />
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{#if canCreate}
					<ActionRowLink
						href="/sessions/new"
						title={t('dashboard.club.createSession.title')}
						description={t('dashboard.club.createSession.description')}
						icon={PlusIcon}
						accent="violet"
					/>
				{/if}
				<ActionRowLink
					href="/sessions/history"
					title={t('dashboard.club.history.title')}
					description={t('dashboard.club.history.description')}
					icon={ClockIcon}
					accent="indigo"
				/>
			</div>
		</div>

		{#if filteredSessions.length > 0}
			<dl class="grid grid-cols-2 gap-3">
				<div class="app-history-stat">
					<dt class="app-history-stat-label">{t('sessions.list.allSessions')}</dt>
					<dd class="app-history-stat-value">{summary.total}</dd>
				</div>
				<div class="app-history-stat">
					<dt class="app-history-stat-label">{t('session.status.open')}</dt>
					<dd class="app-history-stat-value">{summary.open}</dd>
				</div>
				<div class="app-history-stat">
					<dt class="app-history-stat-label">{t('session.status.inProgress')}</dt>
					<dd class="app-history-stat-value">{summary.inProgress}</dd>
				</div>
				<div class="app-history-stat">
					<dt class="app-history-stat-label">{t('session.status.draft')}</dt>
					<dd class="app-history-stat-value">{summary.draft}</dd>
				</div>
			</dl>
		{/if}

		<div class="space-y-4">
			<SectionHeading title={t('sessions.list.allSessions')} />
			{#if filteredSessions.length === 0}
				<EmptyState message={t('sessions.list.noActive')} />
			{:else}
				<div class="space-y-3">
					{#each pagedSessions.items as session (session.id)}
						<SessionListLink
							{session}
							userId={data.userId}
							showClub={data.isSuperAdmin}
							active={page.url.pathname === `/sessions/${session.id}`}
						/>
					{/each}
					<Pagination
						page={pagedSessions.page}
						totalPages={pagedSessions.totalPages}
						hasPrev={pagedSessions.hasPrev}
						hasNext={pagedSessions.hasNext}
						onprev={() => (listPage -= 1)}
						onnext={() => (listPage += 1)}
					/>
				</div>
			{/if}
		</div>
	</section>

	<div class="min-w-0 flex-1 {!hasDetail ? 'hidden lg:block' : ''}">
		{@render children()}
	</div>
</div>
