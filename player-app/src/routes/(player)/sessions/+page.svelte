<script lang="ts">
	import { browser } from '$app/environment';
	import { invalidate } from '$app/navigation';
	import { goto } from '$app/navigation';
	import SessionDetailSheet from '$lib/components/SessionDetailSheet.svelte';
	import { sessionInProgressJoinRemark } from '$lib/config/session';
	import { isEarlyLeftSession, sessionsWithDistance, shouldShowInProgressJoinRemark } from '$lib/sessions/nearby';
	import { liveSessionHref, shouldOpenLiveSession, shouldViewSessionLivePage } from '$lib/sessions/navigation';
	import SessionLiveTimers from '@repo/ui/components/SessionLiveTimers.svelte';
	import SessionStartCountdown from '@repo/ui/components/SessionStartCountdown.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import DashboardTile from '@repo/ui/components/DashboardTile.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import Pagination from '@repo/ui/components/Pagination.svelte';
	import CalendarDaysIcon from '@repo/ui/icons/CalendarDaysIcon.svelte';
	import RefreshIcon from '@repo/ui/icons/RefreshIcon.svelte';
	import { formatDateTime, formatSessionDuration } from '@repo/ui/datetime';
	import {
		formatDistanceKm,
		loadStoredUserLocation,
		USER_LOCATION_STORED_EVENT
	} from '@repo/ui/geolocation';
	import { sessionPlayerStatusLabel, sessionStatusLabel } from '$lib/types/session';
	import type { SessionListItem } from '$lib/types/session';
	import { paginate } from '@repo/ui/pagination';
	import { t } from '@repo/ui/i18n';
	import type { LayoutData } from '../$types';
	import type { PageData } from './$types';

	let { data }: { data: PageData & LayoutData } = $props();

	let userLocation = $state(loadStoredUserLocation());
	const sessions = $derived(sessionsWithDistance(data.sessions ?? [], userLocation));
	const sortedByDistance = $derived(userLocation !== null);
	const sessionCountLabel = $derived(
		sessions.length === 1
			? t('common.sessionCount', { count: sessions.length })
			: t('common.sessionCountPlural', { count: sessions.length })
	);
	const sectionTitle = $derived(
		sortedByDistance ? t('sessions.list.nearby') : t('sessions.list.upcoming')
	);
	const sectionMeta = $derived(
		sessions.length === 0
			? t('sessions.list.emptyMeta')
			: sortedByDistance
				? t('sessions.list.metaLocation', { count: sessionCountLabel })
				: t('sessions.list.meta', { count: sessionCountLabel })
	);

	let sheetOpen = $state(false);
	let selectedSession = $state<SessionListItem | null>(null);
	let refreshing = $state(false);
	let navigatingSessionId = $state<string | null>(null);
	let listPage = $state(1);

	const pagedSessions = $derived(paginate(sessions, listPage));

	$effect(() => {
		data.sessions;
		userLocation;
		listPage = 1;
	});

	const openSession = (session: SessionListItem) => {
		if (shouldOpenLiveSession(session) || shouldViewSessionLivePage(session)) {
			if (navigatingSessionId) return;
			navigatingSessionId = session.id;
			void goto(liveSessionHref(session.id)).finally(() => {
				navigatingSessionId = null;
			});
			return;
		}

		selectedSession = session;
		sheetOpen = true;
	};

	const closeSheet = () => {
		sheetOpen = false;
		selectedSession = null;
	};

	const refreshSessions = async () => {
		if (refreshing) return;
		refreshing = true;
		try {
			await invalidate('app:sessions');
		} finally {
			refreshing = false;
		}
	};

	const sessionDurationBadge = (session: SessionListItem) => {
		const label = formatSessionDuration(session.start_at, session.end_at);
		return label === '—' ? undefined : label;
	};

	const sessionDescription = (session: SessionListItem) => {
		const parts = [session.club?.name, formatDateTime(session.start_at)].filter(Boolean);
		if (isEarlyLeftSession(session)) {
			parts.push(t('sessions.list.earlyLeaveRemark'));
		} else if (shouldShowInProgressJoinRemark(session)) {
			parts.push(sessionInProgressJoinRemark());
		} else if (session.my_membership) {
			parts.push(sessionPlayerStatusLabel(session.my_membership.status));
		}
		return parts.join(' · ');
	};

	$effect(() => {
		if (!browser) return;

		const syncLocation = () => {
			userLocation = loadStoredUserLocation();
		};

		window.addEventListener(USER_LOCATION_STORED_EVENT, syncLocation);
		window.addEventListener('storage', syncLocation);

		return () => {
			window.removeEventListener(USER_LOCATION_STORED_EVENT, syncLocation);
			window.removeEventListener('storage', syncLocation);
		};
	});
</script>

<section class="space-y-6">
	<DashboardHero
		eyebrow={t('sessions.list.eyebrow')}
		title={t('sessions.list.title')}
		subtitle={t('sessions.list.subtitle')}
	>
		{#if sessions.length > 0}
			<span class="app-hero-stat app-hero-stat--accent">{sessionCountLabel}</span>
			{#if sortedByDistance}
				<span class="app-hero-stat app-hero-stat--success">{t('common.sortedByDistance')}</span>
			{/if}
		{/if}
	</DashboardHero>

	<div class="space-y-4">
		<header class="app-section-header">
			<div class="min-w-0">
				<h2 class="app-section-title">{sectionTitle}</h2>
				<p class="app-section-meta">{sectionMeta}</p>
			</div>
			<div class="flex shrink-0 items-center gap-2">
				<a href="/sessions/history" class="app-section-action">{t('sessions.list.historyLink')}</a>
				<button
					type="button"
					class="app-section-action"
					disabled={refreshing}
					aria-label={t('sessions.list.refreshAria')}
					aria-busy={refreshing}
					onclick={refreshSessions}
				>
					{#if refreshing}
						<span
							class="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-brand-600"
							aria-hidden="true"
						></span>
					{:else}
						<RefreshIcon class="h-4 w-4 text-brand-700" />
					{/if}
					{t('common.refresh')}
				</button>
			</div>
		</header>

		{#if sessions.length === 0}
			<EmptyState message={t('sessions.list.empty')} />
		{:else}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{#each pagedSessions.items as session (session.id)}
					<DashboardTile
						title={session.name}
						description={sessionDescription(session)}
						icon={CalendarDaysIcon}
						badge={session.distanceKm !== null ? formatDistanceKm(session.distanceKm) : undefined}
						durationBadge={sessionDurationBadge(session)}
						secondaryBadge={sessionStatusLabel(session.status)}
						secondaryBadgeBrand={session.status === 'open' || session.status === 'in_progress'}
						loading={navigatingSessionId === session.id}
						onclick={() => openSession(session)}
					>
						{#snippet extra()}
							{#if session.status === 'in_progress'}
								<SessionLiveTimers startAt={session.start_at} endAt={session.end_at} class="mb-1" />
								{#if isEarlyLeftSession(session)}
									<p class="text-xs text-slate-600 dark:text-slate-400 dark:text-slate-500">{t('sessions.list.earlyLeaveDetail')}</p>
								{:else if shouldShowInProgressJoinRemark(session)}
									<p class="text-xs text-sky-700">{sessionInProgressJoinRemark()}</p>
								{/if}
							{:else if session.status === 'open'}
								<SessionStartCountdown
									startAt={session.start_at}
									active
									showUntilStart
									variant="compact"
								/>
							{/if}
						{/snippet}
					</DashboardTile>
				{/each}
			</div>
			<Pagination
				page={pagedSessions.page}
				totalPages={pagedSessions.totalPages}
				hasPrev={pagedSessions.hasPrev}
				hasNext={pagedSessions.hasNext}
				onprev={() => (listPage -= 1)}
				onnext={() => (listPage += 1)}
			/>
		{/if}
	</div>
</section>

<SessionDetailSheet
	open={sheetOpen}
	sessionId={selectedSession?.id ?? null}
	preview={selectedSession}
	onClose={closeSheet}
/>
