<script lang="ts">
	import { browser } from '$app/environment';
	import { invalidate } from '$app/navigation';
	import { goto } from '$app/navigation';
	import ClubDetailSheet from '$lib/components/ClubDetailSheet.svelte';
	import SessionDetailSheet from '$lib/components/SessionDetailSheet.svelte';
	import { clubsWithDistance, formatOpenSessionBadge, openSessionCountByClub } from '$lib/clubs/nearby';
	import { featuredSessions, myJoinedSessions } from '$lib/sessions/nearby';
	import { liveSessionHref, shouldOpenLiveSession } from '$lib/sessions/navigation';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import DashboardTile from '@repo/ui/components/DashboardTile.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import ActionRowLink from '@repo/ui/components/ActionRowLink.svelte';
	import BuildingIcon from '@repo/ui/icons/BuildingIcon.svelte';
	import LayersIcon from '@repo/ui/icons/LayersIcon.svelte';
	import RefreshIcon from '@repo/ui/icons/RefreshIcon.svelte';
	import UserIcon from '@repo/ui/icons/UserIcon.svelte';
	import { formatDateTime } from '@repo/ui/datetime';
	import {
		formatDistanceKm,
		loadStoredUserLocation,
		USER_LOCATION_STORED_EVENT
	} from '@repo/ui/geolocation';
	import { isRichTextEmpty, richTextExcerpt } from '@repo/ui/richText';
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
	const featured = $derived(featuredSessions(data.sessions ?? [], userLocation));
	const sortedByDistance = $derived(userLocation !== null);
	const profileName = $derived(data.profile?.display_name ?? 'Player');
	const clubCountLabel = $derived(`${clubs.length} club${clubs.length === 1 ? '' : 's'}`);
	const totalSessions = $derived(data.sessions?.length ?? 0);
	const hasMoreSessions = $derived(totalSessions > featured.length);
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
			? 'Upcoming games appear here once clubs schedule them'
			: sortedByDistance
				? 'Nearest first · tap to view and join'
				: 'Soonest first · tap to view and join'
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

	let clubSheetOpen = $state(false);
	let selectedClub = $state<ClubPublic | null>(null);
	let sessionSheetOpen = $state(false);
	let selectedSession = $state<SessionListItem | null>(null);
	let sessionSheetId = $state<string | null>(null);
	let refreshing = $state(false);

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
			void goto(liveSessionHref(session.id));
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
		if (session.my_membership) {
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

	<div class="space-y-3">
		<SectionHeading title="Quick actions" />
		<div class="app-quick-actions-grid">
			<DashboardTile
				href="/sessions"
				title="Sessions"
				description="Browse and join games"
				icon={LayersIcon}
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
				icon={BuildingIcon}
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
				{#each mySessions as session (session.id)}
					<DashboardTile
						title={session.name}
						description={joinedSessionDescription(session)}
						icon={LayersIcon}
						accent="brand"
						badge={session.distanceKm !== null ? formatDistanceKm(session.distanceKm) : undefined}
						secondaryBadge={sessionStatusLabel(session.status)}
						secondaryBadgeBrand={session.status === 'open' || session.status === 'in_progress'}
						tertiaryBadge={membershipBadge(session)}
						tertiaryBadgeBrand={session.my_membership?.status === 'confirmed'}
						onclick={() => openSession(session)}
					/>
				{/each}
			</div>
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
						icon={LayersIcon}
						accent="violet"
						badge={session.distanceKm !== null ? formatDistanceKm(session.distanceKm) : undefined}
						secondaryBadge={sessionStatusLabel(session.status)}
						secondaryBadgeBrand={session.status === 'open' || session.status === 'in_progress'}
						onclick={() => openSession(session)}
					/>
				{/each}
			</div>
		{/if}

		<ActionRowLink
			href="/sessions"
			title="Browse all sessions"
			description={hasMoreSessions
				? `View all ${totalSessions} upcoming sessions`
				: 'See the full sessions list'}
			icon={LayersIcon}
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
				{#each clubs as club (club.id)}
					{@const openCount = openSessionCounts.get(club.id) ?? 0}
					<DashboardTile
						title={club.name}
						description={isRichTextEmpty(club.description)
							? 'Tap to view club and sessions'
							: richTextExcerpt(club.description)}
						icon={BuildingIcon}
						accent="indigo"
						badge={club.distanceKm !== null ? formatDistanceKm(club.distanceKm) : undefined}
						secondaryBadge={formatOpenSessionBadge(openCount)}
						secondaryBadgeBrand={openCount > 0}
						onclick={() => openClub(club)}
					/>
				{/each}
			</div>
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
