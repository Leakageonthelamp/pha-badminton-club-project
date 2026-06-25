<script lang="ts">
	import { invalidate } from '$app/navigation';
	import ClubDetailSheet from '$lib/components/ClubDetailSheet.svelte';
	import RefreshIcon from '$lib/components/icons/RefreshIcon.svelte';
	import type { ClubPublic } from '$lib/types/club';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const clubs = $derived(data.clubs ?? []);
	const page = $derived(data.page ?? 1);
	const totalPages = $derived(data.totalPages ?? 1);

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

<section class="space-y-8 py-4">
	<div class="text-center">
		<h1 class="text-2xl font-semibold text-slate-900">Home</h1>
		<p class="mt-2 text-sm text-slate-500">Find clubs and join sessions near you.</p>
	</div>

	<div class="space-y-4">
		<div>
			<div class="flex items-center justify-between gap-3">
				<h2 class="text-lg font-semibold text-slate-900">Clubs</h2>
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
			<p class="text-sm text-slate-600">Browse active clubs in the system.</p>
		</div>

		{#if clubs.length === 0}
			<div class="rounded-2xl border border-slate-200 bg-white p-4 text-center">
				<p class="text-sm text-slate-600">No active clubs yet. Check back later.</p>
			</div>
		{:else}
			<ul class="grid grid-cols-2 gap-3">
				{#each clubs as club (club.id)}
					<li class="min-w-0">
						<button
							type="button"
							class="flex h-full w-full flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-200 hover:shadow-sm"
							onclick={() => openClub(club)}
						>
							<h3 class="line-clamp-2 text-sm font-semibold text-slate-900">{club.name}</h3>
							{#if club.description}
								<p class="mt-1 line-clamp-2 text-xs text-slate-600">{club.description}</p>
							{/if}
						</button>
					</li>
				{/each}
			</ul>

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
