<script lang="ts">
	import { browser } from '$app/environment';
	import { invalidate } from '$app/navigation';
	import { goto } from '$app/navigation';
	import SessionDetailSheet from '$lib/components/SessionDetailSheet.svelte';
	import { sessionsWithDistance } from '$lib/sessions/nearby';
	import { liveSessionHref, shouldOpenLiveSession } from '$lib/sessions/navigation';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import DashboardTile from '@repo/ui/components/DashboardTile.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import LayersIcon from '@repo/ui/icons/LayersIcon.svelte';
	import RefreshIcon from '@repo/ui/icons/RefreshIcon.svelte';
	import { formatDateTime } from '@repo/ui/datetime';
	import {
		formatDistanceKm,
		loadStoredUserLocation,
		USER_LOCATION_STORED_EVENT
	} from '@repo/ui/geolocation';
	import { sessionPlayerStatusLabel, sessionStatusLabel } from '$lib/types/session';
	import type { SessionListItem } from '$lib/types/session';
	import type { LayoutData } from '../$types';
	import type { PageData } from './$types';

	let { data }: { data: PageData & LayoutData } = $props();

	let userLocation = $state(loadStoredUserLocation());
	const sessions = $derived(sessionsWithDistance(data.sessions ?? [], userLocation));
	const sortedByDistance = $derived(userLocation !== null);
	const sessionCountLabel = $derived(`${sessions.length} session${sessions.length === 1 ? '' : 's'}`);
	const sectionTitle = $derived(sortedByDistance ? 'Nearby sessions' : 'Upcoming sessions');
	const sectionMeta = $derived(
		sessions.length === 0
			? 'Open sessions appear here once clubs schedule them'
			: sortedByDistance
				? `${sessionCountLabel} · nearest first, soonest on top`
				: `${sessionCountLabel} · soonest first`
	);

	let sheetOpen = $state(false);
	let selectedSession = $state<SessionListItem | null>(null);
	let refreshing = $state(false);

	const openSession = (session: SessionListItem) => {
		if (shouldOpenLiveSession(session)) {
			void goto(liveSessionHref(session.id));
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
		eyebrow="Sessions"
		title="Find a game"
		subtitle="Browse upcoming sessions and join the waiting list."
	>
		{#if sessions.length > 0}
			<span class="app-hero-stat">{sessionCountLabel}</span>
			{#if sortedByDistance}
				<span class="app-hero-stat app-hero-stat--success">Sorted by distance</span>
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
				<a href="/sessions/history" class="app-section-action">Session history</a>
				<button
					type="button"
					class="app-section-action"
					disabled={refreshing}
					aria-label="Refresh sessions"
					aria-busy={refreshing}
					onclick={refreshSessions}
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
			</div>
		</header>

		{#if sessions.length === 0}
			<EmptyState message="No upcoming sessions yet. Check back later." />
		{:else}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{#each sessions as session (session.id)}
					<DashboardTile
						title={session.name}
						description={sessionDescription(session)}
						icon={LayersIcon}
						badge={session.distanceKm !== null ? formatDistanceKm(session.distanceKm) : undefined}
						secondaryBadge={sessionStatusLabel(session.status)}
						secondaryBadgeBrand={session.status === 'open' || session.status === 'in_progress'}
						onclick={() => openSession(session)}
					/>
				{/each}
			</div>
		{/if}
	</div>
</section>

<SessionDetailSheet
	open={sheetOpen}
	sessionId={selectedSession?.id ?? null}
	preview={selectedSession}
	onClose={closeSheet}
/>
