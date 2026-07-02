<script lang="ts">
	import { t } from '$lib/i18n';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import DashboardTile from '@repo/ui/components/DashboardTile.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import BanknotesIcon from '@repo/ui/icons/BanknotesIcon.svelte';
	import CalendarDaysIcon from '@repo/ui/icons/CalendarDaysIcon.svelte';
	import PlusIcon from '@repo/ui/icons/PlusIcon.svelte';
	import UserIcon from '@repo/ui/icons/UserIcon.svelte';
	import { adminRoleHeroBadgeClass } from '$lib/adminRoleHero';
	import { appRoleLabel, type AppRole } from '$lib/types/auth';
	import type { LayoutData } from './$types';

	let { data }: { data: LayoutData } = $props();

	const profileName = $derived(data.profile?.display_name ?? t('role.superAdmin'));
	const clubCount = $derived(data.clubs.length);
	const activeClubCount = $derived(data.clubs.filter((club) => club.is_active).length);
	const inactiveClubCount = $derived(clubCount - activeClubCount);
	const effectiveAppRole = $derived(data.effectiveAppRole ?? null);
	const roleLabel = $derived(
		effectiveAppRole ? appRoleLabel(effectiveAppRole as AppRole) : ''
	);
	const roleBadgeClass = $derived(adminRoleHeroBadgeClass(effectiveAppRole));
</script>

<section class="space-y-8">
	<DashboardHero
		eyebrow={t('dashboard.super.eyebrow')}
		title={profileName}
		tag={data.profile?.tag}
		roleLabel={roleLabel}
		roleBadgeClass={roleBadgeClass}
		subtitle={t('dashboard.super.subtitle')}
	>
		{#if clubCount > 0}
			<span class="app-hero-stat app-hero-stat--accent">
				{t('dashboard.super.clubsStat', { count: clubCount })}
			</span>
			{#if activeClubCount > 0}
				<span class="app-hero-stat app-hero-stat--success">
					{t('dashboard.super.activeStat', { count: activeClubCount })}
				</span>
			{/if}
			{#if inactiveClubCount > 0}
				<span class="app-hero-stat app-hero-stat--warn">
					{t('dashboard.super.inactiveStat', { count: inactiveClubCount })}
				</span>
			{/if}
		{/if}
	</DashboardHero>

	<div class="space-y-3">
		<SectionHeading title={t('dashboard.super.quickActions')} />
		<div class="app-quick-actions-grid">
			<DashboardTile
				href="/clubs/new"
				title={t('dashboard.super.createClub.title')}
				description={t('dashboard.super.createClub.description')}
				icon={PlusIcon}
				accent="brand"
			/>
			<DashboardTile
				href="/users"
				title={t('dashboard.super.users.title')}
				description={t('dashboard.super.users.description')}
				icon={UserIcon}
				accent="secondary"
			/>
			<DashboardTile
				href="/sessions"
				title={t('dashboard.super.sessions.title')}
				description={t('dashboard.super.sessions.description')}
				icon={CalendarDaysIcon}
				accent="violet"
			/>
			<DashboardTile
				href="/transactions"
				title={t('dashboard.super.transactions.title')}
				description={t('dashboard.super.transactions.description')}
				icon={BanknotesIcon}
				accent="indigo"
			/>
		</div>
	</div>

	{#if data.clubs.length === 0}
		<EmptyState message={t('dashboard.super.noClubs')}>
			<a href="/clubs/new" class="text-sm font-medium text-brand-700 dark:text-brand-300 hover:text-brand-800">
				{t('dashboard.super.createFirstClub')}
			</a>
		</EmptyState>
	{:else}
		<section class="app-card-padded hidden min-h-48 items-center justify-center lg:flex">
			<EmptyState message={t('masterDetail.selectClub')} />
		</section>
	{/if}
</section>
