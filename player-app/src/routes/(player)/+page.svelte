<script lang="ts">
	import { invalidate } from '$app/navigation';
	import ClubDetailSheet from '$lib/components/ClubDetailSheet.svelte';
	import RefreshIcon from '@repo/ui/icons/RefreshIcon.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import DashboardTile from '@repo/ui/components/DashboardTile.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import BuildingIcon from '@repo/ui/icons/BuildingIcon.svelte';
	import type { ClubPublic } from '$lib/types/club';
	import type { LayoutData } from '../$types';
	import type { PageData } from './$types';

	let { data }: { data: PageData & LayoutData } = $props();

	const clubs = $derived(data.clubs ?? []);
	const page = $derived(data.page ?? 1);
	const totalPages = $derived(data.totalPages ?? 1);
	const profileName = $derived(data.profile?.display_name ?? 'Player');

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
</script>

<section class="space-y-6">
	<DashboardHero
		eyebrow="Welcome back"
		title={profileName}
		tag={data.profile?.tag}
		subtitle="Find clubs and join sessions near you."
	/>

	<div class="space-y-4">
		<div class="flex items-center justify-between gap-3 px-1">
			<SectionHeading title="Clubs" class="!px-0" />
			<button
				type="button"
				class="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-700 p-2.5 text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:opacity-70"
				disabled={refreshing}
				aria-label="Refresh clubs"
				aria-busy={refreshing}
				onclick={refreshClubs}
			>
				{#if refreshing}
					<span
						class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
						aria-hidden="true"
					></span>
				{:else}
					<RefreshIcon class="h-5 w-5" />
				{/if}
			</button>
		</div>

		{#if clubs.length === 0}
			<EmptyState message="No active clubs yet. Check back later." />
		{:else}
			<div class="grid grid-cols-2 gap-4">
				{#each clubs as club (club.id)}
					<DashboardTile
						title={club.name}
						description={club.description || 'Tap to view details'}
						icon={BuildingIcon}
						onclick={() => openClub(club)}
					/>
				{/each}
			</div>

			{#if totalPages > 1}
				<nav class="flex items-center justify-between gap-3 pt-1" aria-label="Clubs pagination">
					{#if page > 1}
						<a
							href="/?page={page - 1}"
							class="text-sm font-medium text-brand-700 hover:text-brand-800"
						>
							Previous
						</a>
					{:else}
						<span class="text-sm text-slate-300">Previous</span>
					{/if}

					<p class="text-sm text-slate-500">
						Page {page} of {totalPages}
					</p>

					{#if page < totalPages}
						<a
							href="/?page={page + 1}"
							class="text-sm font-medium text-brand-700 hover:text-brand-800"
						>
							Next
						</a>
					{:else}
						<span class="text-sm text-slate-300">Next</span>
					{/if}
				</nav>
			{/if}
		{/if}
	</div>
</section>

<ClubDetailSheet
	open={sheetOpen}
	clubId={selectedClub?.id ?? null}
	preview={selectedClub}
	onClose={closeSheet}
/>
