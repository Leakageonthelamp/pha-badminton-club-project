<script lang="ts">
	import { navigating } from '$app/state';
	import { goto } from '$app/navigation';
	import SessionDetailSheet from '$lib/components/SessionDetailSheet.svelte';
	import { clubFilterOptions, sessionStatusFilterOptions } from '$lib/sessions/history';
	import { liveSessionHref, shouldOpenHistorySessionSummary } from '$lib/sessions/navigation';
	import {
		sessionPlayerStatusLabel,
		sessionStatusBadgeClass,
		sessionStatusLabel
	} from '$lib/types/session';
	import type { SessionHistoryItem } from '$lib/types/session';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import Pagination from '@repo/ui/components/Pagination.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import DashboardIcon from '@repo/ui/components/DashboardIcon.svelte';
	import DatePicker from '@repo/ui/components/DatePicker.svelte';
	import SelectMenu from '@repo/ui/components/SelectMenu.svelte';
	import { formatDateTime } from '@repo/ui/datetime';
	import ClockIcon from '@repo/ui/icons/ClockIcon.svelte';
	import SearchIcon from '@repo/ui/icons/SearchIcon.svelte';
	import { t } from '@repo/ui/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let statusFilter = $state('');
	let clubFilter = $state('');
	let dateFilter = $state('');
	let sheetOpen = $state(false);
	let selectedSessionId = $state<string | null>(null);
	let navigatingSessionId = $state<string | null>(null);
	let paginationNav = $state<'prev' | 'next' | null>(null);
	let linkNav = $state<'clear' | 'browse' | null>(null);

	const history = $derived(data.history);
	const clubOptions = $derived(clubFilterOptions(history.clubs));

	const isFetching = $derived(
		navigating.to !== null && navigating.to.url.pathname === '/sessions/history'
	);

	const historyActionsBusy = $derived(
		isFetching || navigatingSessionId !== null || paginationNav !== null || linkNav !== null
	);

	const hasActiveFilters = $derived(
		Boolean(history.statusFilter || history.clubFilter || history.date)
	);
	const isFilteredEmpty = $derived(hasActiveFilters && history.items.length === 0);

	$effect(() => {
		statusFilter = history.statusFilter;
		clubFilter = history.clubFilter;
		dateFilter = history.date;
	});

	const buildPageUrl = (page: number): string => {
		const params = new URLSearchParams();
		if (history.statusFilter) params.set('hStatus', history.statusFilter);
		if (history.clubFilter) params.set('hClub', history.clubFilter);
		if (history.date) params.set('hDate', history.date);
		if (page > 1) params.set('hPage', String(page));
		const query = params.toString();
		return query ? `/sessions/history?${query}` : '/sessions/history';
	};

	const openSession = (item: SessionHistoryItem) => {
		if (historyActionsBusy) return;

		if (shouldOpenHistorySessionSummary(item)) {
			navigatingSessionId = item.id;
			void goto(liveSessionHref(item.id)).finally(() => {
				navigatingSessionId = null;
			});
			return;
		}

		selectedSessionId = item.id;
		sheetOpen = true;
	};

	const goToPage = (page: number, direction: 'prev' | 'next') => {
		if (historyActionsBusy) return;
		paginationNav = direction;
		void goto(buildPageUrl(page)).finally(() => {
			paginationNav = null;
		});
	};

	const goClearFilters = () => {
		if (historyActionsBusy) return;
		linkNav = 'clear';
		void goto('/sessions/history').finally(() => {
			linkNav = null;
		});
	};

	const goBrowseSessions = () => {
		if (historyActionsBusy) return;
		linkNav = 'browse';
		void goto('/sessions').finally(() => {
			linkNav = null;
		});
	};

	const closeSheet = () => {
		sheetOpen = false;
		selectedSessionId = null;
	};
</script>

<section class="space-y-6">
	<DashboardHero
		eyebrow={t('sessions.list.eyebrow')}
		title={t('sessions.history.title')}
		subtitle={t('sessions.history.subtitle')}
	>
		{#if !isFetching && history.totalCount > 0}
			<span class="app-hero-stat app-hero-stat--accent">{t('common.total', { count: history.totalCount })}</span>
		{/if}
	</DashboardHero>

	<AppCard>
		<div class="space-y-2">
			<form method="GET" action="/sessions/history" class="history-filter-form">
			<DatePicker id="history-date" label={t('common.date')} variant="filter" bind:value={dateFilter} />
			<input type="hidden" name="hDate" value={dateFilter} />
			<div class="min-w-0">
				<SelectMenu
					id="history-club"
					label={t('common.club')}
					options={clubOptions}
					bind:value={clubFilter}
				/>
				<input type="hidden" name="hClub" value={clubFilter} />
			</div>
			<div class="min-w-0">
				<SelectMenu
					id="history-status"
					label={t('common.status')}
					options={sessionStatusFilterOptions()}
					bind:value={statusFilter}
				/>
				<input type="hidden" name="hStatus" value={statusFilter} />
			</div>
			<div class="app-filter-submit-wrap">
				<button
					type="submit"
					class="app-filter-submit"
					aria-label={t('sessions.history.filterAria')}
					title={t('common.filter')}
					disabled={historyActionsBusy}
					aria-busy={isFetching}
				>
					{#if isFetching}
						<span
							class="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-brand-700"
							aria-hidden="true"
						></span>
					{:else}
						<SearchIcon class="h-4 w-4 text-brand-700" />
					{/if}
				</button>
			</div>
		</form>

		{#if hasActiveFilters && !isFetching}
			<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
				{t('common.filtered')}
				{#if history.date}
					· {history.date}
				{/if}
				{#if history.clubFilter}
					· {clubOptions.find((option) => option.value === history.clubFilter)?.label ??
						history.clubFilter}
				{/if}
				{#if history.statusFilter}
					· {sessionStatusFilterOptions().find((option) => option.value === history.statusFilter)?.label ??
						history.statusFilter}
				{/if}
			</p>
		{/if}
		</div>

		<div class="history-list-body">
		{#if isFetching}
			<ul class="space-y-3" aria-busy="true">
				{#each Array(3) as _, index (index)}
					<li class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
						<div class="app-skeleton mb-2 h-4 w-40 max-w-full rounded"></div>
						<div class="app-skeleton mb-2 h-3.5 w-28 max-w-full rounded"></div>
						<div class="app-skeleton h-3.5 w-52 max-w-full rounded"></div>
					</li>
				{/each}
			</ul>
		{:else if history.items.length === 0}
			<div
				class="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-gradient-to-b from-slate-50/90 to-white px-4 py-8 text-center"
			>
				<DashboardIcon icon={isFilteredEmpty ? SearchIcon : ClockIcon} accent="indigo" class="mx-auto" />
				{#if isFilteredEmpty}
					<p class="mt-3 text-sm font-medium text-slate-900 dark:text-slate-100">{t('sessions.history.noMatchFilters')}</p>
					<p class="mx-auto mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
						{t('sessions.history.noMatchFiltersHint')}
					</p>
					<button
						type="button"
						class="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-700 dark:text-brand-300 hover:text-brand-800 dark:text-brand-300 disabled:opacity-50"
						disabled={historyActionsBusy}
						aria-busy={linkNav === 'clear'}
						onclick={goClearFilters}
					>
						{#if linkNav === 'clear'}
							<span
								class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-brand-700"
								aria-hidden="true"
							></span>
						{/if}
						{t('common.clearFilters')}
					</button>
				{:else}
					<p class="mt-3 text-sm font-medium text-slate-900 dark:text-slate-100">{t('sessions.history.empty')}</p>
					<p class="mx-auto mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
						{t('sessions.history.emptyHint')}
					</p>
					<button
						type="button"
						class="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-700 dark:text-brand-300 hover:text-brand-800 dark:text-brand-300 disabled:opacity-50"
						disabled={historyActionsBusy}
						aria-busy={linkNav === 'browse'}
						onclick={goBrowseSessions}
					>
						{#if linkNav === 'browse'}
							<span
								class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-brand-700"
								aria-hidden="true"
							></span>
						{/if}
						{t('sessions.history.browseSessions')}
					</button>
				{/if}
			</div>
		{:else}
			<ul class="space-y-3">
				{#each history.items as item (item.id)}
					<li>
						<button
							type="button"
							class="history-session-row w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-left transition hover:border-brand-200 hover:bg-brand-50/40 active:bg-brand-50/60 {navigatingSessionId ===
							item.id
								? 'nav-loading'
								: ''}"
							disabled={historyActionsBusy && navigatingSessionId !== item.id}
							aria-busy={navigatingSessionId === item.id}
							onclick={() => openSession(item)}
						>
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0 flex-1 space-y-1.5">
									<p class="text-base font-semibold leading-snug text-slate-900 dark:text-slate-100">{item.name}</p>
									<p class="text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">{item.club_name}</p>
									<p class="text-sm leading-relaxed text-slate-500 dark:text-slate-400 dark:text-slate-500">
										{formatDateTime(item.start_at)} · {sessionPlayerStatusLabel(item.membership_status)}
									</p>
								</div>
								<span
									class="inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset {sessionStatusBadgeClass(
										item.status
									)}"
								>
									{sessionStatusLabel(item.status)}
								</span>
							</div>
						</button>
					</li>
				{/each}
			</ul>

			<Pagination
				page={history.page}
				hasPrev={history.hasPrevPage}
				hasNext={history.hasNextPage}
				pending={paginationNav}
				disabled={historyActionsBusy}
				onprev={() => goToPage(history.page - 1, 'prev')}
				onnext={() => goToPage(history.page + 1, 'next')}
			/>
		{/if}
		</div>
	</AppCard>
</section>

<SessionDetailSheet open={sheetOpen} sessionId={selectedSessionId} onClose={closeSheet} />
