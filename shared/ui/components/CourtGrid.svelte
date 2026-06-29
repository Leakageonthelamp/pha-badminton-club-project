<script lang="ts">
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

	const hasTeams = (match: CourtMatch | undefined) =>
		Boolean(match?.teamA?.length || match?.teamB?.length);

	const footerHint = (match: CourtMatch | undefined, clickable: boolean) => {
		if (match?.score) return `Score ${match.score}`;
		if (match?.game) return `Game ${match.game}`;
		if (!match?.status) {
			return clickable ? 'Tap to assign a match' : 'No match assigned';
		}
		return clickable ? 'Tap to open match control' : courtGridStatusLabel(match.status);
	};
</script>

{#snippet courtIcon()}
	<div class="app-court-grid-icon" aria-hidden="true">
		<div class="absolute inset-x-1.5 top-1/2 h-px -translate-y-1/2 bg-brand-300/90"></div>
		<div class="absolute inset-y-1.5 left-1/2 w-px -translate-x-1/2 bg-brand-300/90"></div>
	</div>
{/snippet}

{#snippet courtBody(court: { courtNumber: number; match?: CourtMatch }, clickable: boolean)}
	{@render courtIcon()}

	<div class="min-w-0 flex-1 space-y-1.5">
		<div class="flex items-start justify-between gap-2">
			<p class="text-sm font-semibold text-slate-800">Court {court.courtNumber}</p>
			<span
				class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium {court.match?.status
					? matchStatusBadgeClass(court.match.status)
					: 'bg-slate-100 text-slate-600'}"
			>
				{courtGridStatusLabel(court.match?.status)}
			</span>
		</div>

		{#if hasTeams(court.match)}
			<div class="space-y-1">
				{#if court.match?.teamA?.length}
					<p class="text-sm leading-snug text-slate-700">
						<span class="font-semibold text-brand-700">A</span>
						<span class="text-slate-500"> · </span>
						<span class="break-words">{court.match.teamA.join(' · ')}</span>
					</p>
				{/if}
				{#if court.match?.teamB?.length}
					<p class="text-sm leading-snug text-slate-700">
						<span class="font-semibold text-slate-600">B</span>
						<span class="text-slate-500"> · </span>
						<span class="break-words">{court.match.teamB.join(' · ')}</span>
					</p>
				{/if}
			</div>
		{:else if court.match?.players?.length}
			<p class="text-sm leading-snug break-words text-slate-700">
				{court.match.players.join(' · ')}
			</p>
		{:else}
			<p class="text-sm text-slate-500">
				{clickable ? 'Available for a new match' : 'No match on this court'}
			</p>
		{/if}

		<p class="text-xs text-slate-400">{footerHint(court.match, clickable)}</p>
	</div>
{/snippet}

<div class="grid items-stretch gap-3 sm:grid-cols-2">
	{#each courts as court (court.courtNumber)}
		{@const clickable = Boolean(onCourtClick)}
		{@const isLoading = loadingCourtNumber === court.courtNumber}
		{#if clickable}
			<button
				type="button"
				class="app-court-grid-card w-full text-left transition hover:border-brand-300 hover:shadow-sm {isLoading
					? 'app-court-grid-card--loading'
					: ''}"
				disabled={isLoading}
				aria-busy={isLoading || undefined}
				onclick={() => handleCourtClick(court.courtNumber)}
			>
				{@render courtBody(court, true)}
			</button>
		{:else}
			<div class="app-court-grid-card">
				{@render courtBody(court, false)}
			</div>
		{/if}
	{/each}
</div>
