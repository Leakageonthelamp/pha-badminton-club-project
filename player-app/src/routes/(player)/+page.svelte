<script lang="ts">
	import { browser } from '$app/environment';
	import { invalidate } from '$app/navigation';
	import ClubDetailSheet from '$lib/components/ClubDetailSheet.svelte';
	import { clubsWithDistance } from '$lib/clubs/nearby';
	import RefreshIcon from '@repo/ui/icons/RefreshIcon.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import DashboardTile from '@repo/ui/components/DashboardTile.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import BuildingIcon from '@repo/ui/icons/BuildingIcon.svelte';
	import LayersIcon from '@repo/ui/icons/LayersIcon.svelte';
	import {
		formatDistanceKm,
		loadStoredUserLocation,
		USER_LOCATION_STORED_EVENT
	} from '@repo/ui/geolocation';
	import { isRichTextEmpty, richTextExcerpt } from '@repo/ui/richText';
	import type { ClubPublic } from '$lib/types/club';
	import type { LayoutData } from '../$types';
	import type { PageData } from './$types';

	let { data }: { data: PageData & LayoutData } = $props();

	let userLocation = $state(loadStoredUserLocation());
	const clubs = $derived(clubsWithDistance(data.clubs ?? [], userLocation));
	const sortedByDistance = $derived(userLocation !== null);
	const profileName = $derived(data.profile?.display_name ?? 'Player');
	const clubCountLabel = $derived(`${clubs.length} club${clubs.length === 1 ? '' : 's'}`);
	const sectionTitle = $derived(sortedByDistance ? 'Nearby clubs' : 'Clubs');
	const sectionMeta = $derived(
		clubs.length === 0
			? sortedByDistance
				? 'Nearest clubs appear here once available'
				: 'Active clubs appear here once available'
			: sortedByDistance
				? `${clubCountLabel} · nearest first`
				: `${clubCountLabel} · A–Z`
	);

	let sheetOpen = $state(false);
	let selectedClub = $state<ClubPublic | null>(null);
	let refreshing = $state(false);

	const openClub = (club: ClubPublic) => {
		selectedClub = club;
		sheetOpen = true;
	};

	const closeSheet = () => {
		sheetOpen = false;
		selectedClub = null;
	};

	const refreshClubs = async () => {
		if (refreshing) return;

		refreshing = true;
		try {
			await invalidate('app:clubs');
		} finally {
			refreshing = false;
		}
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
		subtitle="Find clubs and join sessions near you."
	>
		{#if clubs.length > 0}
			<span class="app-hero-stat">{clubCountLabel}</span>
			{#if sortedByDistance}
				<span class="app-hero-stat app-hero-stat--success">Sorted by distance</span>
			{/if}
		{/if}
	</DashboardHero>

	<div class="grid grid-cols-2 gap-3">
		<DashboardTile
			href="/sessions"
			title="Sessions"
			description="Find and join upcoming games"
			icon={LayersIcon}
			accent="violet"
		/>
	</div>

	<div class="space-y-4">
		<header class="app-section-header">
			<div class="min-w-0">
				<h2 class="app-section-title">{sectionTitle}</h2>
				<p class="app-section-meta">{sectionMeta}</p>
			</div>
			<button
				type="button"
				class="app-section-action"
				disabled={refreshing}
				aria-label="Refresh clubs"
				aria-busy={refreshing}
				onclick={refreshClubs}
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

		{#if clubs.length === 0}
			<EmptyState message="No active clubs yet. Check back later." />
		{:else}
			<div class="grid grid-cols-2 gap-3">
				{#each clubs as club (club.id)}
					<DashboardTile
						title={club.name}
						description={isRichTextEmpty(club.description)
							? 'Tap to view details'
							: richTextExcerpt(club.description)}
						icon={BuildingIcon}
						badge={club.distanceKm !== null ? formatDistanceKm(club.distanceKm) : undefined}
						onclick={() => openClub(club)}
					/>
				{/each}
			</div>
		{/if}
	</div>
</section>

<ClubDetailSheet
	open={sheetOpen}
	clubId={selectedClub?.id ?? null}
	preview={selectedClub}
	onClose={closeSheet}
/>
