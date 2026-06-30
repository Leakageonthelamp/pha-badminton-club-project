<script lang="ts">
	import { navigating } from '$app/state';
	import { goto } from '$app/navigation';
	import {
		resultFilterOptions,
		sessionFilterOptions
	} from '$lib/matches/history';
	import { liveSessionHref } from '$lib/sessions/navigation';
	import type { MatchHistoryItem } from '$lib/types/match';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import DashboardIcon from '@repo/ui/components/DashboardIcon.svelte';
	import DatePicker from '@repo/ui/components/DatePicker.svelte';
	import MatchSummaryModal from '@repo/ui/components/MatchSummaryModal.svelte';
	import PlayerMatchHistoryCard from '@repo/ui/components/PlayerMatchHistoryCard.svelte';
	import SelectMenu from '@repo/ui/components/SelectMenu.svelte';
	import { formatDateTime, formatUptime } from '@repo/ui/datetime';
	import LayersIcon from '@repo/ui/icons/LayersIcon.svelte';
	import SearchIcon from '@repo/ui/icons/SearchIcon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let resultFilter = $state('');
	let sessionFilter = $state('');
	let dateFilter = $state('');
	let summaryOpen = $state(false);
	let selectedMatch = $state<MatchHistoryItem | null>(null);
	let paginationNav = $state<'prev' | 'next' | null>(null);
	let linkNav = $state<'clear' | 'browse' | null>(null);

	const history = $derived(data.history);
	const sessionOptions = $derived(sessionFilterOptions(history.sessions));

	const isFetching = $derived(
		navigating.to !== null && navigating.to.url.pathname === '/matches/history'
	);

	const historyActionsBusy = $derived(
		isFetching || summaryOpen || paginationNav !== null || linkNav !== null
	);

	const hasActiveFilters = $derived(
		Boolean(history.resultFilter || history.sessionFilter || history.date)
	);
	const isFilteredEmpty = $derived(hasActiveFilters && history.items.length === 0);

	const avgDurationLabel = $derived.by(() => {
		const avgMs = history.summary.avgDurationMs;
		if (avgMs === null || avgMs <= 0) return '—';
		return formatUptime(new Date(0).toISOString(), avgMs);
	});

	$effect(() => {
		resultFilter = history.resultFilter;
		sessionFilter = history.sessionFilter;
		dateFilter = history.date;
	});

	const buildPageUrl = (page: number): string => {
		const params = new URLSearchParams();
		if (history.resultFilter) params.set('mResult', history.resultFilter);
		if (history.sessionFilter) params.set('mSession', history.sessionFilter);
		if (history.date) params.set('mDate', history.date);
		if (page > 1) params.set('mPage', String(page));
		const query = params.toString();
		return query ? `/matches/history?${query}` : '/matches/history';
	};

	const openMatch = (item: MatchHistoryItem) => {
		if (historyActionsBusy) return;
		selectedMatch = item;
		summaryOpen = true;
	};

	const closeSummary = () => {
		summaryOpen = false;
		selectedMatch = null;
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
		void goto('/matches/history').finally(() => {
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
</script>

<section class="space-y-6">
	<DashboardHero
		eyebrow="Matches"
		title="Match history"
		subtitle="Every completed match you played, newest first."
	>
		{#if !isFetching && history.summary.totalMatches > 0}
			<span class="app-hero-stat">{history.summary.totalMatches} total</span>
		{/if}
	</DashboardHero>

	{#if history.summary.totalMatches > 0}
		<AppCard>
			<h2 class="text-sm font-semibold text-slate-900">Your performance</h2>
			<p class="mt-0.5 text-xs text-slate-500">All-time stats across completed matches.</p>
			<dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
				<div class="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
					<dt class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
						Record
					</dt>
					<dd class="mt-1 text-lg font-semibold tabular-nums text-slate-900">
						{history.summary.wins}W · {history.summary.losses}L
					</dd>
				</div>
				<div class="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
					<dt class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
						Win rate
					</dt>
					<dd class="mt-1 text-lg font-semibold tabular-nums text-slate-900">
						{history.summary.winRate !== null ? `${history.summary.winRate}%` : '—'}
					</dd>
				</div>
				<div class="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
					<dt class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
						Avg duration
					</dt>
					<dd class="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900">
						{avgDurationLabel}
					</dd>
				</div>
				<div class="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
					<dt class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
						Matches
					</dt>
					<dd class="mt-1 text-lg font-semibold tabular-nums text-slate-900">
						{history.summary.totalMatches}
					</dd>
				</div>
				<div class="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5 sm:col-span-2">
					<dt class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
						Shuttles used
					</dt>
					<dd class="mt-1 text-lg font-semibold tabular-nums text-slate-900">
						{history.summary.totalShuttles}
					</dd>
				</div>
			</dl>
		</AppCard>
	{/if}

	<AppCard>
		<div class="space-y-2">
			<form method="GET" action="/matches/history" class="history-filter-form">
				<DatePicker id="match-history-date" label="Date" variant="filter" bind:value={dateFilter} />
				<input type="hidden" name="mDate" value={dateFilter} />
				<div class="min-w-0">
					<SelectMenu
						id="match-history-session"
						label="Session"
						options={sessionOptions}
						bind:value={sessionFilter}
					/>
					<input type="hidden" name="mSession" value={sessionFilter} />
				</div>
				<div class="min-w-0">
					<SelectMenu
						id="match-history-result"
						label="Result"
						options={resultFilterOptions}
						bind:value={resultFilter}
					/>
					<input type="hidden" name="mResult" value={resultFilter} />
				</div>
				<div class="app-filter-submit-wrap">
					<button
						type="submit"
						class="app-filter-submit"
						aria-label="Filter match history"
						title="Filter"
						disabled={historyActionsBusy}
						aria-busy={isFetching}
					>
						{#if isFetching}
							<span
								class="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700"
								aria-hidden="true"
							></span>
						{:else}
							<SearchIcon class="h-4 w-4 text-brand-700" />
						{/if}
					</button>
				</div>
			</form>

			{#if hasActiveFilters && !isFetching}
				<p class="text-xs text-slate-500">
					Filtered
					{#if history.date}
						· {history.date}
					{/if}
					{#if history.sessionFilter}
						· {sessionOptions.find((option) => option.value === history.sessionFilter)?.label ??
							history.sessionFilter}
					{/if}
					{#if history.resultFilter}
						· {resultFilterOptions.find((option) => option.value === history.resultFilter)?.label ??
							history.resultFilter}
					{/if}
				</p>
			{/if}
		</div>

		<div class="history-list-body">
			{#if isFetching}
				<ul class="space-y-3" aria-busy="true">
					{#each Array(3) as _, index (index)}
						<li class="rounded-xl border border-slate-200 bg-white p-4">
							<div class="app-skeleton mb-2 h-4 w-40 max-w-full rounded"></div>
							<div class="app-skeleton mb-2 h-3.5 w-28 max-w-full rounded"></div>
							<div class="app-skeleton h-3.5 w-52 max-w-full rounded"></div>
						</li>
					{/each}
				</ul>
			{:else if history.items.length === 0}
				<div
					class="rounded-xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50/90 to-white px-4 py-8 text-center"
				>
					<DashboardIcon icon={isFilteredEmpty ? SearchIcon : LayersIcon} accent="violet" class="mx-auto" />
					{#if isFilteredEmpty}
						<p class="mt-3 text-sm font-medium text-slate-900">No matches match your filters</p>
						<p class="mx-auto mt-1 max-w-xs text-sm text-slate-500">
							Try another date, session, or result, or reset to see your full match history.
						</p>
						<button
							type="button"
							class="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-800 disabled:opacity-50"
							disabled={historyActionsBusy}
							aria-busy={linkNav === 'clear'}
							onclick={goClearFilters}
						>
							{#if linkNav === 'clear'}
								<span
									class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700"
									aria-hidden="true"
								></span>
							{/if}
							Clear filters
						</button>
					{:else}
						<p class="mt-3 text-sm font-medium text-slate-900">No match history yet</p>
						<p class="mx-auto mt-1 max-w-xs text-sm text-slate-500">
							Completed matches from sessions you join will appear here.
						</p>
						<button
							type="button"
							class="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-800 disabled:opacity-50"
							disabled={historyActionsBusy}
							aria-busy={linkNav === 'browse'}
							onclick={goBrowseSessions}
						>
							{#if linkNav === 'browse'}
								<span
									class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700"
									aria-hidden="true"
								></span>
							{/if}
							Browse sessions →
						</button>
					{/if}
				</div>
			{:else}
				<ul class="space-y-3">
					{#each history.items as item, index (item.id)}
						<li>
							<PlayerMatchHistoryCard
								match={item}
								userId={data.userId}
								matchNumber={history.items.length - index}
								title="Court {item.court_number}"
								subtitle="{item.session_name} · {item.club_name}"
								disabled={historyActionsBusy && !summaryOpen}
								onClick={() => openMatch(item)}
							/>
							<p class="mt-1 px-1 text-xs text-slate-500">
								{#if item.ended_at}
									{formatDateTime(item.ended_at)}
								{:else}
									{formatDateTime(item.session_start_at)}
								{/if}
								{#if item.score}
									· {item.score}
								{/if}
							</p>
						</li>
					{/each}
				</ul>

				{#if history.hasPrevPage || history.hasNextPage}
					<div class="flex items-center justify-center gap-3 pt-1 text-sm">
						{#if history.hasPrevPage}
							<button
								type="button"
								class="inline-flex items-center gap-1.5 font-medium text-brand-700 disabled:opacity-50"
								disabled={historyActionsBusy}
								aria-busy={paginationNav === 'prev'}
								onclick={() => goToPage(history.page - 1, 'prev')}
							>
								{#if paginationNav === 'prev'}
									<span
										class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700"
										aria-hidden="true"
									></span>
								{/if}
								← Prev
							</button>
						{/if}
						<span class="text-slate-500">{history.page}</span>
						{#if history.hasNextPage}
							<button
								type="button"
								class="inline-flex items-center gap-1.5 font-medium text-brand-700 disabled:opacity-50"
								disabled={historyActionsBusy}
								aria-busy={paginationNav === 'next'}
								onclick={() => goToPage(history.page + 1, 'next')}
							>
								{#if paginationNav === 'next'}
									<span
										class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700"
										aria-hidden="true"
									></span>
								{/if}
								Next →
							</button>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	</AppCard>
</section>

<MatchSummaryModal
	open={summaryOpen}
	match={selectedMatch}
	highlightUserId={data.userId}
	sessionName={selectedMatch?.session_name ?? null}
	sessionHref={selectedMatch ? liveSessionHref(selectedMatch.session_id) : null}
	onClose={closeSummary}
/>
