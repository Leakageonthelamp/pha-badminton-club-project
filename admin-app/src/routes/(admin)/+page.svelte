<script lang="ts">
	import { t } from '$lib/i18n';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import DashboardIcon from '@repo/ui/components/DashboardIcon.svelte';
	import DashboardTile from '@repo/ui/components/DashboardTile.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import Pagination from '@repo/ui/components/Pagination.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import SelectMenu from '@repo/ui/components/SelectMenu.svelte';
	import UserGroupIcon from '@repo/ui/icons/UserGroupIcon.svelte';
	import BanknotesIcon from '@repo/ui/icons/BanknotesIcon.svelte';
	import PlusIcon from '@repo/ui/icons/PlusIcon.svelte';
	import SearchIcon from '@repo/ui/icons/SearchIcon.svelte';
	import UserIcon from '@repo/ui/icons/UserIcon.svelte';
	import CalendarDaysIcon from '@repo/ui/icons/CalendarDaysIcon.svelte';
	import { isRichTextEmpty, richTextExcerpt, richTextPlainText } from '@repo/ui/richText';
	import { paginate } from '@repo/ui/pagination';
	import { adminRoleHeroBadgeClass } from '$lib/adminRoleHero';
	import { appRoleLabel, type AppRole } from '$lib/types/auth';
	import type { Club } from '$lib/types/club';
	import type { LayoutData } from '../$types';
	import type { PageData } from './$types';

	let { data }: { data: PageData & LayoutData } = $props();

	let searchQuery = $state('');
	let statusFilter = $state<'all' | 'active' | 'inactive'>('all');
	let listPage = $state(1);

	const profileName = $derived(data.profile?.display_name ?? t('role.superAdmin'));
	const clubCount = $derived(data.clubs.length);
	const activeClubCount = $derived(data.clubs.filter((club) => club.is_active).length);
	const inactiveClubCount = $derived(clubCount - activeClubCount);
	const effectiveAppRole = $derived(data.effectiveAppRole ?? null);
	const roleLabel = $derived(
		effectiveAppRole ? appRoleLabel(effectiveAppRole as AppRole) : ''
	);
	const roleBadgeClass = $derived(adminRoleHeroBadgeClass(effectiveAppRole));

	const statusFilterOptions = [
		{ value: 'all', label: t('dashboard.super.statusAll') },
		{ value: 'active', label: t('dashboard.super.statusActive') },
		{ value: 'inactive', label: t('dashboard.super.statusInactive') }
	];

	const normalizedSearch = $derived(searchQuery.trim().toLowerCase());

	const filteredClubs = $derived(
		data.clubs.filter((club) => {
			if (statusFilter === 'active' && !club.is_active) return false;
			if (statusFilter === 'inactive' && club.is_active) return false;
			if (!normalizedSearch) return true;

			const haystack = [
				club.name,
				club.venue_name ?? '',
				richTextPlainText(club.description)
			]
				.join(' ')
				.toLowerCase();

			return haystack.includes(normalizedSearch);
		})
	);

	const pagedClubs = $derived(paginate(filteredClubs, listPage));

	$effect(() => {
		searchQuery;
		statusFilter;
		listPage = 1;
	});

	function clubSubtitle(club: Club): string {
		if (club.venue_name) return club.venue_name;
		if (!isRichTextEmpty(club.description)) return richTextExcerpt(club.description, 100);
		return club.is_active ? t('dashboard.super.tapManageActive') : t('dashboard.super.tapManageInactive');
	}

	function clubLimits(club: Club): string {
		return `Up to ${club.max_active_sessions} active session${club.max_active_sessions === 1 ? '' : 's'} · ${club.max_admins} admin${club.max_admins === 1 ? '' : 's'}`;
	}
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
				{clubCount} club{clubCount === 1 ? '' : 's'}
			</span>
			{#if activeClubCount > 0}
				<span class="app-hero-stat app-hero-stat--success">
					{activeClubCount} active
				</span>
			{/if}
			{#if inactiveClubCount > 0}
				<span class="app-hero-stat app-hero-stat--warn">
					{inactiveClubCount} inactive
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
				Create your first club
			</a>
		</EmptyState>
	{:else}
		<div class="space-y-4">
			<div class="app-section-header px-1">
				<div class="min-w-0">
					<h2 class="app-section-title">{t('dashboard.super.allClubs')}</h2>
					<p class="app-section-meta">
						{clubCount} total · {activeClubCount} active
						{#if inactiveClubCount > 0}
							· {inactiveClubCount} inactive
						{/if}
					</p>
				</div>
				<a href="/clubs/new" class="app-section-action">
					<PlusIcon class="h-4 w-4" />
					New club
				</a>
			</div>

			<div class="app-filter-row">
				<div class="min-w-0">
					<label for="club-search" class="app-filter-label">{t('dashboard.super.searchLabel')}</label>
					<input
						id="club-search"
						type="search"
						bind:value={searchQuery}
						placeholder={t('dashboard.super.searchPlaceholder')}
						class="app-filter-input"
					/>
				</div>
				<div class="min-w-0">
					<SelectMenu
						id="club-status-filter"
						label={t('dashboard.super.statusLabel')}
						options={statusFilterOptions}
						bind:value={statusFilter}
					/>
				</div>
				<div class="app-filter-submit-wrap">
					<span class="app-filter-label invisible" aria-hidden="true">{t('dashboard.super.searchLabel')}</span>
					<button
						type="button"
						class="app-filter-submit"
						aria-label={t('dashboard.super.searchAria')}
						title={t('dashboard.super.searchLabel')}
					>
						<SearchIcon class="h-5 w-5 text-brand-700" />
					</button>
				</div>
			</div>

			{#if filteredClubs.length === 0}
				<EmptyState message={t('dashboard.super.noMatch')}>
					<button
						type="button"
						class="text-sm font-medium text-brand-700 dark:text-brand-300 hover:text-brand-800"
						onclick={() => {
							searchQuery = '';
							statusFilter = 'all';
						}}
					>
						Clear filters
					</button>
				</EmptyState>
			{:else}
				<div class="space-y-3">
					<SectionHeading
						title="{filteredClubs.length} club{filteredClubs.length === 1 ? '' : 's'}"
					/>
					{#if normalizedSearch}
						<p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Results for “{searchQuery.trim()}”</p>
					{/if}

					<ul class="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
						{#each pagedClubs.items as club (club.id)}
							<li>
								<a
									href="/clubs/{club.id}"
									class="group flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-950"
								>
									<DashboardIcon
										icon={UserGroupIcon}
										accent={club.is_active ? 'indigo' : 'brand'}
										class={club.is_active ? '' : 'opacity-70'}
									/>
									<div class="min-w-0 flex-1">
										<div class="flex flex-wrap items-center gap-2">
											<span class="truncate font-medium text-slate-900 dark:text-slate-100">{club.name}</span>
											{#if club.is_active}
												<span
													class="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200/80"
												>
													Active
												</span>
											{:else}
												<span class="app-role-badge bg-amber-50 text-amber-900 ring-1 ring-amber-200/80">
													Inactive
												</span>
											{/if}
										</div>
										<p class="mt-0.5 truncate text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">{clubSubtitle(club)}</p>
										<p class="mt-1 text-xs text-slate-400 dark:text-slate-500">{clubLimits(club)}</p>
									</div>
									<span class="app-action-row-arrow shrink-0" aria-hidden="true">→</span>
								</a>
							</li>
						{/each}
					</ul>
					<Pagination
						page={pagedClubs.page}
						totalPages={pagedClubs.totalPages}
						hasPrev={pagedClubs.hasPrev}
						hasNext={pagedClubs.hasNext}
						onprev={() => (listPage -= 1)}
						onnext={() => (listPage += 1)}
					/>
				</div>
			{/if}
		</div>
	{/if}
</section>
