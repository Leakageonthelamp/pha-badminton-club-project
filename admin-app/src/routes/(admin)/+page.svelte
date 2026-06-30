<script lang="ts">
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import DashboardIcon from '@repo/ui/components/DashboardIcon.svelte';
	import DashboardTile from '@repo/ui/components/DashboardTile.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import SelectMenu from '@repo/ui/components/SelectMenu.svelte';
	import UserGroupIcon from '@repo/ui/icons/UserGroupIcon.svelte';
	import BanknotesIcon from '@repo/ui/icons/BanknotesIcon.svelte';
	import PlusIcon from '@repo/ui/icons/PlusIcon.svelte';
	import SearchIcon from '@repo/ui/icons/SearchIcon.svelte';
	import UserIcon from '@repo/ui/icons/UserIcon.svelte';
	import CalendarDaysIcon from '@repo/ui/icons/CalendarDaysIcon.svelte';
	import { isRichTextEmpty, richTextExcerpt, richTextPlainText } from '@repo/ui/richText';
	import { adminRoleHeroBadgeClass } from '$lib/adminRoleHero';
	import { appRoleLabel, type AppRole } from '$lib/types/auth';
	import type { Club } from '$lib/types/club';
	import type { LayoutData } from '../$types';
	import type { PageData } from './$types';

	let { data }: { data: PageData & LayoutData } = $props();

	let searchQuery = $state('');
	let statusFilter = $state<'all' | 'active' | 'inactive'>('all');

	const profileName = $derived(data.profile?.display_name ?? 'Super admin');
	const clubCount = $derived(data.clubs.length);
	const activeClubCount = $derived(data.clubs.filter((club) => club.is_active).length);
	const inactiveClubCount = $derived(clubCount - activeClubCount);
	const effectiveAppRole = $derived(data.effectiveAppRole ?? null);
	const roleLabel = $derived(
		effectiveAppRole ? appRoleLabel(effectiveAppRole as AppRole) : ''
	);
	const roleBadgeClass = $derived(adminRoleHeroBadgeClass(effectiveAppRole));

	const statusFilterOptions = [
		{ value: 'all', label: 'All statuses' },
		{ value: 'active', label: 'Active only' },
		{ value: 'inactive', label: 'Inactive only' }
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

	function clubSubtitle(club: Club): string {
		if (club.venue_name) return club.venue_name;
		if (!isRichTextEmpty(club.description)) return richTextExcerpt(club.description, 100);
		return club.is_active ? 'Tap to manage club settings' : 'Inactive — tap to review settings';
	}

	function clubLimits(club: Club): string {
		return `Up to ${club.max_active_sessions} active session${club.max_active_sessions === 1 ? '' : 's'} · ${club.max_admins} admin${club.max_admins === 1 ? '' : 's'}`;
	}
</script>

<section class="space-y-8">
	<DashboardHero
		eyebrow="Admin dashboard"
		title={profileName}
		tag={data.profile?.tag}
		roleLabel={roleLabel}
		roleBadgeClass={roleBadgeClass}
		subtitle="Create and manage clubs and their admins."
	>
		{#if clubCount > 0}
			<span class="app-hero-stat">
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
		<SectionHeading title="Quick actions" />
		<div class="app-quick-actions-grid">
			<DashboardTile
				href="/clubs/new"
				title="Create club"
				description="Add a new club to the system"
				icon={PlusIcon}
				accent="violet"
			/>
			<DashboardTile
				href="/users"
				title="Users"
				description="View and manage all accounts"
				icon={UserIcon}
				accent="indigo"
			/>
			<DashboardTile
				href="/sessions"
				title="Sessions"
				description="View all club sessions"
				icon={CalendarDaysIcon}
				accent="violet"
			/>
			<DashboardTile
				href="/transactions"
				title="Payment transactions"
				description="Session fees and cancellation fees"
				icon={BanknotesIcon}
				accent="indigo"
			/>
		</div>
	</div>

	{#if data.clubs.length === 0}
		<EmptyState message="No clubs yet.">
			<a href="/clubs/new" class="text-sm font-medium text-brand-700 hover:text-brand-800">
				Create your first club
			</a>
		</EmptyState>
	{:else}
		<div class="space-y-4">
			<div class="app-section-header px-1">
				<div class="min-w-0">
					<h2 class="app-section-title">All clubs</h2>
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
					<label for="club-search" class="app-filter-label">Search</label>
					<input
						id="club-search"
						type="search"
						bind:value={searchQuery}
						placeholder="Search name, venue, or description"
						class="app-filter-input"
					/>
				</div>
				<div class="min-w-0">
					<SelectMenu
						id="club-status-filter"
						label="Status"
						options={statusFilterOptions}
						bind:value={statusFilter}
					/>
				</div>
				<div class="app-filter-submit-wrap">
					<span class="app-filter-label invisible" aria-hidden="true">Search</span>
					<button
						type="button"
						class="app-filter-submit"
						aria-label="Search clubs"
						title="Search"
					>
						<SearchIcon class="h-5 w-5 text-brand-700" />
					</button>
				</div>
			</div>

			{#if filteredClubs.length === 0}
				<EmptyState message="No clubs match your filters.">
					<button
						type="button"
						class="text-sm font-medium text-brand-700 hover:text-brand-800"
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
						<p class="text-sm text-slate-500">Results for “{searchQuery.trim()}”</p>
					{/if}

					<ul class="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
						{#each filteredClubs as club (club.id)}
							<li>
								<a
									href="/clubs/{club.id}"
									class="group flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50"
								>
									<DashboardIcon
										icon={UserGroupIcon}
										accent={club.is_active ? 'indigo' : 'brand'}
										class={club.is_active ? '' : 'opacity-70'}
									/>
									<div class="min-w-0 flex-1">
										<div class="flex flex-wrap items-center gap-2">
											<span class="truncate font-medium text-slate-900">{club.name}</span>
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
										<p class="mt-0.5 truncate text-sm text-slate-600">{clubSubtitle(club)}</p>
										<p class="mt-1 text-xs text-slate-400">{clubLimits(club)}</p>
									</div>
									<span class="app-action-row-arrow shrink-0" aria-hidden="true">→</span>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	{/if}
</section>
