<script lang="ts">
	import { browser } from '$app/environment';
	import { invalidate } from '$app/navigation';
	import { goto } from '$app/navigation';
	import ClubDetailSheet from '$lib/components/ClubDetailSheet.svelte';
	import SessionDetailSheet from '$lib/components/SessionDetailSheet.svelte';
	import { clubsWithDistance, formatOpenSessionBadge, openSessionCountByClub } from '$lib/clubs/nearby';
	import { featuredSessions, isJoinableFeaturedSession, myJoinedSessions, shouldShowInProgressJoinRemark } from '$lib/sessions/nearby';
	import { findLiveSession, liveSessionHref, shouldOpenLiveSession } from '$lib/sessions/navigation';
	import SessionLiveTimers from '@repo/ui/components/SessionLiveTimers.svelte';
	import SessionStartCountdown from '@repo/ui/components/SessionStartCountdown.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import DashboardIcon from '@repo/ui/components/DashboardIcon.svelte';
	import DashboardTile from '@repo/ui/components/DashboardTile.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import ActionRowLink from '@repo/ui/components/ActionRowLink.svelte';
	import UserGroupIcon from '@repo/ui/icons/UserGroupIcon.svelte';
	import CalendarDaysIcon from '@repo/ui/icons/CalendarDaysIcon.svelte';
	import ClockIcon from '@repo/ui/icons/ClockIcon.svelte';
	import RefreshIcon from '@repo/ui/icons/RefreshIcon.svelte';
	import TrophyIcon from '@repo/ui/icons/TrophyIcon.svelte';
	import UserIcon from '@repo/ui/icons/UserIcon.svelte';
	import { formatDateTime, formatSessionDuration } from '@repo/ui/datetime';
	import {
		formatDistanceKm,
		loadStoredUserLocation,
		USER_LOCATION_STORED_EVENT
	} from '@repo/ui/geolocation';
	import { isRichTextEmpty, richTextExcerpt } from '@repo/ui/richText';
	import { DASHBOARD_PREVIEW_LIMIT } from '@repo/ui/pagination';
	import { SESSION_IN_PROGRESS_JOIN_REMARK } from '$lib/config/session';
	import { sessionPlayerStatusLabel, sessionStatusLabel } from '$lib/types/session';
	import type { ClubPublic } from '$lib/types/club';
	import type { SessionListItem } from '$lib/types/session';
	import type { LayoutData } from '../$types';
	import type { PageData } from './$types';

	let { data }: { data: PageData & LayoutData } = $props();

	let userLocation = $state(loadStoredUserLocation());
	const clubs = $derived(clubsWithDistance(data.clubs ?? [], userLocation));
	const openSessionCounts = $derived(openSessionCountByClub(data.sessions ?? []));
	const mySessions = $derived(myJoinedSessions(data.sessions ?? [], userLocation));
	const previewMySessions = $derived(mySessions.slice(0, DASHBOARD_PREVIEW_LIMIT));
	const hasMoreMySessions = $derived(mySessions.length > DASHBOARD_PREVIEW_LIMIT);
	const featured = $derived(featuredSessions(data.sessions ?? [], userLocation));
	const sortedByDistance = $derived(userLocation !== null);
	const profileName = $derived(data.profile?.display_name ?? 'Player');
	const liveSession = $derived(findLiveSession(data.sessions ?? []));
	const liveSessionSubtitle = $derived.by(() => {
		if (!liveSession) return '';

		const parts: string[] = [];
		if (liveSession.club?.name) parts.push(liveSession.club.name);
		parts.push(`Playing as ${profileName}`);
		return parts.join(' · ');
	});
	const clubCountLabel = $derived(`${clubs.length} club${clubs.length === 1 ? '' : 's'}`);
	const totalSessions = $derived(data.sessions?.length ?? 0);
	const joinableSessionCount = $derived(
		(data.sessions ?? []).filter(isJoinableFeaturedSession).length
	);
	const hasMoreSessions = $derived(joinableSessionCount > featured.length);
	const sectionTitle = $derived(sortedByDistance ? 'Nearby clubs' : 'Clubs');
	const sectionMeta = $derived(
		clubs.length === 0
			? sortedByDistance
				? 'Nearest clubs appear here once available'
				: 'Active clubs appear here once available'
			: sortedByDistance
				? `${clubCountLabel} · nearest first · open sessions shown on each club`
				: `${clubCountLabel} · A–Z · open sessions shown on each club`
	);
	const featuredMeta = $derived(
		featured.length === 0
			? 'Open and in-progress sessions you can join will appear here'
			: sortedByDistance
				? `Top ${featured.length} nearest joinable sessions · tap to view and join`
				: `Top ${featured.length} joinable sessions · tap to view and join`
	);
	const mySessionsMeta = $derived(
		mySessions.length === 0
			? 'Sessions you join will appear here with waiting list and queue'
			: `${mySessions.length} joined · tap for details and roster`
	);

	const joinedSessionDescription = (session: SessionListItem) => {
		const parts = [
			session.club?.name,
			formatDateTime(session.start_at),
			`${session.waiting_count} waiting · ${session.queued_count} queued`
		].filter(Boolean);
		return parts.join(' · ');
	};

	const membershipBadge = (session: SessionListItem) =>
		session.my_membership ? sessionPlayerStatusLabel(session.my_membership.status) : undefined;

	const sessionDurationBadge = (session: SessionListItem) => {
		const label = formatSessionDuration(session.start_at, session.end_at);
		return label === '—' ? undefined : label;
	};

	let clubSheetOpen = $state(false);
	let selectedClub = $state<ClubPublic | null>(null);
	let sessionSheetOpen = $state(false);
	let selectedSession = $state<SessionListItem | null>(null);
	let sessionSheetId = $state<string | null>(null);
	let refreshing = $state(false);
	let navigatingSessionId = $state<string | null>(null);
	let clubsExpanded = $state(false);

	const previewClubs = $derived(
		clubsExpanded ? clubs : clubs.slice(0, DASHBOARD_PREVIEW_LIMIT)
	);
	const hasMoreClubs = $derived(clubs.length > DASHBOARD_PREVIEW_LIMIT);

	const openClub = (club: ClubPublic) => {
		selectedClub = club;
		clubSheetOpen = true;
	};

	const closeClubSheet = () => {
		clubSheetOpen = false;
		selectedClub = null;
	};

	const openSession = (session: SessionListItem) => {
		if (shouldOpenLiveSession(session)) {
			if (navigatingSessionId) return;
			navigatingSessionId = session.id;
			void goto(liveSessionHref(session.id)).finally(() => {
				navigatingSessionId = null;
			});
			return;
		}

		sessionSheetId = null;
		selectedSession = session;
		sessionSheetOpen = true;
	};

	const closeSessionSheet = () => {
		sessionSheetOpen = false;
		selectedSession = null;
		sessionSheetId = null;
	};

	const openSessionFromClub = (sessionId: string) => {
		closeClubSheet();
		selectedSession = null;
		sessionSheetId = sessionId;
		sessionSheetOpen = true;
	};

	const refreshDashboard = async () => {
		if (refreshing) return;

		refreshing = true;
		try {
			await Promise.all([invalidate('app:clubs'), invalidate('app:sessions')]);
		} finally {
			refreshing = false;
		}
	};

	const sessionDescription = (session: SessionListItem) => {
		const parts = [session.club?.name, formatDateTime(session.start_at)].filter(Boolean);
		if (shouldShowInProgressJoinRemark(session)) {
			parts.push(SESSION_IN_PROGRESS_JOIN_REMARK);
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
	{#if liveSession}
		<DashboardHero eyebrow="Live session" title={liveSession.name} subtitle={liveSessionSubtitle}>
			<a href={liveSessionHref(liveSession.id)} class="app-hero-action"
				><span>Go to live session</span></a
			>
		</DashboardHero>
	{:else}
		<DashboardHero
			eyebrow="Welcome back"
			title={profileName}
			tag={data.profile?.tag}
			subtitle="Join upcoming sessions or explore clubs near you."
		>
			{#if mySessions.length > 0}
				<span class="app-hero-stat">{mySessions.length} joined</span>
			{/if}
			{#if featured.length > 0}
				<span class="app-hero-stat">{featured.length} featured</span>
			{/if}
			{#if clubs.length > 0}
				<span class="app-hero-stat">{clubCountLabel}</span>
			{/if}
			{#if sortedByDistance}
				<span class="app-hero-stat app-hero-stat--success">Sorted by distance</span>
			{/if}
		</DashboardHero>
	{/if}

	<div class="space-y-3">
		<SectionHeading title="Quick actions" />
		<div class="app-quick-actions-grid">
			<DashboardTile
				href="/sessions"
				title="Sessions"
				description="Browse and join games"
				icon={CalendarDaysIcon}
				accent="violet"
			/>
			<DashboardTile
				href="/sessions/history"
				title="Session history"
				description="Past sessions you joined"
				icon={ClockIcon}
				accent="indigo"
			/>
			<DashboardTile
				href="/matches/history"
				title="Match history"
				description="Wins, scores, and stats"
				icon={TrophyIcon}
				accent="violet"
			/>
			<DashboardTile
				href="/profile"
				title="Profile"
				description="Account and payments"
				icon={UserIcon}
				accent="indigo"
			/>
			<DashboardTile
				href="#clubs"
				title="Clubs"
				description="Explore nearby clubs"
				icon={UserGroupIcon}
				accent="brand"
			/>
		</div>
	</div>

	<div class="space-y-4">
		<header class="app-section-header">
			<div class="min-w-0">
				<h2 class="app-section-title">My sessions</h2>
				<p class="app-section-meta">{mySessionsMeta}</p>
			</div>
		</header>

		{#if mySessions.length === 0}
			<EmptyState message="You haven't joined any upcoming sessions yet." />
		{:else}
			<div class="grid grid-cols-1 gap-3">
				{#each previewMySessions as session (session.id)}
					<DashboardTile
						title={session.name}
						description={joinedSessionDescription(session)}
						icon={CalendarDaysIcon}
						accent="brand"
						badge={session.distanceKm !== null ? formatDistanceKm(session.distanceKm) : undefined}
						durationBadge={sessionDurationBadge(session)}
						secondaryBadge={sessionStatusLabel(session.status)}
						secondaryBadgeBrand={session.status === 'open' || session.status === 'in_progress'}
						tertiaryBadge={membershipBadge(session)}
						tertiaryBadgeBrand={session.my_membership?.status === 'confirmed'}
						loading={navigatingSessionId === session.id}
						onclick={() => openSession(session)}
					>
						{#snippet extra()}
							{#if session.status === 'in_progress'}
								<SessionLiveTimers startAt={session.start_at} endAt={session.end_at} class="mb-1" />
								{#if shouldShowInProgressJoinRemark(session)}
									<p class="text-xs text-sky-700">{SESSION_IN_PROGRESS_JOIN_REMARK}</p>
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
			{#if hasMoreMySessions}
				<ActionRowLink
					href="/sessions"
					title="View all my sessions"
					description="See all {mySessions.length} joined sessions"
					icon={CalendarDaysIcon}
					accent="brand"
				/>
			{/if}
		{/if}
	</div>

	<div class="space-y-4">
		<header class="app-section-header">
			<div class="min-w-0">
				<h2 class="app-section-title">Featured sessions</h2>
				<p class="app-section-meta">{featuredMeta}</p>
			</div>
			<button
				type="button"
				class="app-section-action"
				disabled={refreshing}
				aria-label="Refresh dashboard"
				aria-busy={refreshing}
				onclick={refreshDashboard}
			>
				{#if refreshing}
					<span
						class="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
						aria-hidden="true"
					></span>
				{:else}
					<RefreshIcon class="h-4 w-4 text-brand-700" />
				{/if}
				Refresh
			</button>
		</header>

		{#if featured.length === 0}
			<EmptyState message="No upcoming sessions yet. Check back soon or browse clubs below." />
		{:else}
			<div class="grid grid-cols-1 gap-3">
				{#each featured as session (session.id)}
					<DashboardTile
						title={session.name}
						description={sessionDescription(session)}
						icon={CalendarDaysIcon}
						accent="violet"
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
								{#if shouldShowInProgressJoinRemark(session)}
									<p class="text-xs text-sky-700">{SESSION_IN_PROGRESS_JOIN_REMARK}</p>
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
		{/if}

		<ActionRowLink
			href="/sessions"
			title="Browse all sessions"
			description={hasMoreSessions
				? `View all ${joinableSessionCount} joinable sessions`
				: 'See the full sessions list'}
			icon={CalendarDaysIcon}
			accent="indigo"
		/>
	</div>

	<div id="clubs" class="space-y-4">
		<header class="app-section-header">
			<div class="min-w-0">
				<h2 class="app-section-title">{sectionTitle}</h2>
				<p class="app-section-meta">{sectionMeta}</p>
			</div>
		</header>

		{#if clubs.length === 0}
			<EmptyState message="No active clubs yet. Check back later." />
		{:else}
			<div class="grid grid-cols-2 gap-3">
				{#each previewClubs as club (club.id)}
					{@const openCount = openSessionCounts.get(club.id) ?? 0}
					<DashboardTile
						title={club.name}
						description={isRichTextEmpty(club.description)
							? 'Tap to view club and sessions'
							: richTextExcerpt(club.description)}
						icon={UserGroupIcon}
						accent="indigo"
						badge={club.distanceKm !== null ? formatDistanceKm(club.distanceKm) : undefined}
						secondaryBadge={formatOpenSessionBadge(openCount)}
						secondaryBadgeBrand={openCount > 0}
						onclick={() => openClub(club)}
					/>
				{/each}
			</div>
			{#if hasMoreClubs && !clubsExpanded}
				<!-- ponytail: no /clubs route — expand in-page instead of a dedicated list page -->
				<button
					type="button"
					class="app-action-row group w-full text-left"
					onclick={() => (clubsExpanded = true)}
				>
					<DashboardIcon icon={UserGroupIcon} accent="indigo" />
					<div class="min-w-0 flex-1">
						<p class="font-semibold text-slate-900">View all clubs</p>
						<p class="text-sm leading-snug text-slate-500">See all {clubs.length} clubs</p>
					</div>
					<span class="app-action-row-arrow" aria-hidden="true">→</span>
				</button>
			{/if}
		{/if}
	</div>
</section>

<SessionDetailSheet
	open={sessionSheetOpen}
	sessionId={sessionSheetId ?? selectedSession?.id ?? null}
	preview={selectedSession}
	onClose={closeSessionSheet}
/>

<ClubDetailSheet
	open={clubSheetOpen}
	clubId={selectedClub?.id ?? null}
	preview={selectedClub}
	onClose={closeClubSheet}
	onSessionSelect={openSessionFromClub}
/>
