<script lang="ts">
	import { t } from '$lib/i18n';
	import ActionRowLink from '@repo/ui/components/ActionRowLink.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import DashboardTile from '@repo/ui/components/DashboardTile.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import UpcomingSessionsPanel from '$lib/components/UpcomingSessionsPanel.svelte';
	import ClockIcon from '@repo/ui/icons/ClockIcon.svelte';
	import CalendarDaysIcon from '@repo/ui/icons/CalendarDaysIcon.svelte';
	import BanknotesIcon from '@repo/ui/icons/BanknotesIcon.svelte';
	import PlusIcon from '@repo/ui/icons/PlusIcon.svelte';
	import SettingsIcon from '@repo/ui/icons/SettingsIcon.svelte';
	import { adminRoleHeroBadgeClass } from '$lib/adminRoleHero';
	import { clubWorkspaceState } from '$lib/clubWorkspace.svelte';
	import { filterDraftSessions, filterOngoingSessions, filterSessionsByClub, filterUpcomingSessions } from '$lib/sessions/list';
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
	const draftSessions = $derived(
		activeClub
			? filterDraftSessions(filterSessionsByClub(data.sessions ?? [], activeClub.id))
			: filterDraftSessions(data.sessions ?? [])
	);
</script>

<section class="space-y-6">
	<DashboardHero
		eyebrow={t('dashboard.club.eyebrow')}
		title={data.profileName}
		tag={data.profile?.tag}
		roleLabel={roleLabel}
		roleBadgeClass={roleBadgeClass}
		managingClub={activeClub
			? { name: activeClub.name, is_active: activeClub.is_active }
			: null}
	/>

	{#if clubs.length === 0}
		<EmptyState message={t('dashboard.club.noClubs')} />
	{:else if activeClub}
		<div class="space-y-3">
			<SectionHeading title={t('dashboard.super.quickActions')} />
			<div class="app-quick-actions-grid">
				{#if data.canCreate}
					<DashboardTile
						href="/sessions/new"
						title={t('dashboard.club.createSession.title')}
						description={t('dashboard.club.createSession.description')}
						icon={PlusIcon}
						accent="brand"
					/>
				{/if}
				<DashboardTile
					href="/sessions/history"
					title={t('dashboard.club.history.title')}
					description={t('dashboard.club.history.description')}
					icon={ClockIcon}
					accent="secondary"
				/>
				<DashboardTile
					href="/transactions"
					title={t('dashboard.club.payments.title')}
					description={t('dashboard.club.payments.description')}
					icon={BanknotesIcon}
					accent="indigo"
				/>
			</div>
		</div>

		<UpcomingSessionsPanel
			sessions={draftSessions}
			userId={data.userId}
			limit={5}
			viewAllHref="/sessions"
			tone="amber"
			eyebrow={t('dashboard.club.draft.eyebrow')}
			title={draftSessions.length === 0
				? t('dashboard.club.draft.titleEmpty')
				: `${draftSessions.length} draft${draftSessions.length === 1 ? '' : 's'} need attention`}
			subtitle={t('dashboard.club.draft.subtitle')}
			emptyMessage={t('dashboard.club.draft.empty')}
		/>

		<UpcomingSessionsPanel
			sessions={ongoingSessions}
			userId={data.userId}
			limit={5}
			viewAllHref="/sessions"
			eyebrow={t('dashboard.club.ongoing.eyebrow')}
			title={ongoingSessions.length === 0
				? t('dashboard.club.ongoing.titleEmpty')
				: `${ongoingSessions.length} session${ongoingSessions.length === 1 ? '' : 's'} live now`}
			subtitle={t('dashboard.club.ongoing.subtitle')}
			emptyMessage={t('dashboard.club.ongoing.empty')}
		/>

		<UpcomingSessionsPanel
			sessions={upcomingSessions}
			userId={data.userId}
			limit={5}
			viewAllHref="/sessions"
		/>

		<div class="space-y-3">
			<SectionHeading title={t('dashboard.club.menu')} />
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<ActionRowLink
					href="/clubs/{activeClub.id}"
					title={t('dashboard.club.clubSettings.title')}
					description={t('dashboard.club.clubSettings.description')}
					icon={SettingsIcon}
				/>
				<ActionRowLink
					href="/sessions"
					title={t('dashboard.super.sessions.title')}
					description={t('dashboard.club.sessions.description')}
					icon={CalendarDaysIcon}
					accent="violet"
				/>
				<ActionRowLink
					href="/transactions"
					title={t('dashboard.super.transactions.title')}
					description={t('dashboard.club.transactions.description')}
					icon={BanknotesIcon}
					accent="indigo"
				/>
			</div>
		</div>
	{/if}
</section>
