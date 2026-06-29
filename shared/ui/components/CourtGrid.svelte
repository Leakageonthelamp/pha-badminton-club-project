<script lang="ts">
	import CourtIcon from './CourtIcon.svelte';
	import { courtGridStatusLabel, matchStatusBadgeClass } from '../matches';
	import type { MatchStatus } from '../matches';

	type CourtMatch = {
		matchId?: string;
		courtNumber: number;
		status?: MatchStatus;
		players?: string[];
		teamA?: string[];
		teamB?: string[];
		score?: string;
		game?: string;
	};

	let {
		courtCount,
		matches = [],
		loadingCourtNumber = null,
		onCourtClick
	}: {
		courtCount: number;
		matches?: CourtMatch[];
		loadingCourtNumber?: number | null;
		onCourtClick?: (courtNumber: number) => void;
	} = $props();

	const courts = $derived(
		Array.from({ length: courtCount }, (_, index) => {
			const courtNumber = index + 1;
			const match = matches.find((entry) => entry.courtNumber === courtNumber);
			return { courtNumber, match };
		})
	);

	const handleCourtClick = (courtNumber: number) => {
		if (!onCourtClick || loadingCourtNumber !== null) return;
		onCourtClick(courtNumber);
	};
</script>

{#snippet courtBody(court: { courtNumber: number; match?: CourtMatch })}
	<div class="flex flex-col items-center gap-3">
		<CourtIcon size="md" />
		<p class="text-base font-semibold text-slate-900">Court {court.courtNumber}</p>
		<span
			class="rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset {court.match?.status
				? matchStatusBadgeClass(court.match.status)
				: 'bg-slate-100 text-slate-600 ring-slate-200'}"
		>
			{courtGridStatusLabel(court.match?.status)}
		</span>
	</div>
{/snippet}

<div class="grid items-stretch gap-3 sm:grid-cols-2">
	{#each courts as court (court.courtNumber)}
		{@const clickable = Boolean(onCourtClick)}
		{@const isLoading = loadingCourtNumber === court.courtNumber}
		{#if clickable}
			<button
				type="button"
				class="app-court-tile w-full transition {isLoading ? 'app-court-tile--loading' : ''}"
				disabled={isLoading}
				aria-busy={isLoading || undefined}
				onclick={() => handleCourtClick(court.courtNumber)}
			>
				{@render courtBody(court)}
			</button>
		{:else}
			<div class="app-court-tile">
				{@render courtBody(court)}
			</div>
		{/if}
	{/each}
</div>
