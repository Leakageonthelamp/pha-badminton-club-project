<script lang="ts">
	import { courtGridStatusLabel, matchStatusBadgeClass } from '../matches';
	import type { MatchStatus } from '../matches';

	let {
		courtCount,
		matches = [],
		onCourtClick
	}: {
		courtCount: number;
		matches?: Array<{
			matchId?: string;
			courtNumber: number;
			status?: MatchStatus;
			players?: string[];
			teamA?: string[];
			teamB?: string[];
			score?: string;
			game?: string;
		}>;
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
		if (!onCourtClick) return;
		onCourtClick(courtNumber);
	};
</script>

<div class="grid gap-3 sm:grid-cols-2">
	{#each courts as court (court.courtNumber)}
		{@const clickable = Boolean(onCourtClick)}
		{#if clickable}
			<button
				type="button"
				class="app-muted-panel w-full space-y-3 p-4 text-left transition hover:border-brand-300 hover:shadow-sm"
				onclick={() => handleCourtClick(court.courtNumber)}
			>
			<div class="flex items-center justify-between gap-2">
				<p class="text-sm font-semibold text-slate-800">Court {court.courtNumber}</p>
				<span
					class="rounded-full px-2 py-0.5 text-xs font-medium {court.match?.status
						? matchStatusBadgeClass(court.match.status)
						: 'bg-slate-100 text-slate-600'}"
				>
					{courtGridStatusLabel(court.match?.status)}
				</span>
			</div>

			<div
				class="relative mx-auto aspect-[2/3] w-full max-w-[140px] rounded-2xl border-2 border-brand-300 bg-gradient-to-b from-brand-50 to-white"
				aria-hidden="true"
			>
				<div class="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 bg-brand-300"></div>
				<div class="absolute inset-y-3 left-1/2 w-0.5 -translate-x-1/2 bg-brand-300"></div>
			</div>

			{#if court.match?.teamA?.length || court.match?.teamB?.length}
				<div class="space-y-1 text-xs text-slate-600">
					{#if court.match?.teamA?.length}
						<p><span class="font-medium text-slate-700">A:</span> {court.match.teamA.join(' · ')}</p>
					{/if}
					{#if court.match?.teamB?.length}
						<p><span class="font-medium text-slate-700">B:</span> {court.match.teamB.join(' · ')}</p>
					{/if}
				</div>
			{:else if court.match?.players?.length}
				<p class="text-xs text-slate-600">{court.match.players.join(' · ')}</p>
			{:else}
				<p class="text-xs text-slate-500">
					{clickable
						? court.match?.status
							? 'Tap to open match control'
							: 'Tap to assign a match'
						: 'No match assigned'}
				</p>
			{/if}

			{#if court.match?.score}
				<p class="text-sm font-medium text-slate-800">Score: {court.match.score}</p>
			{/if}

			{#if court.match?.game}
				<p class="text-xs text-slate-500">Game {court.match.game}</p>
			{/if}
			</button>
		{:else}
			<div class="app-muted-panel space-y-3 p-4">
				<div class="flex items-center justify-between gap-2">
					<p class="text-sm font-semibold text-slate-800">Court {court.courtNumber}</p>
					<span
						class="rounded-full px-2 py-0.5 text-xs font-medium {court.match?.status
							? matchStatusBadgeClass(court.match.status)
							: 'bg-slate-100 text-slate-600'}"
					>
						{courtGridStatusLabel(court.match?.status)}
					</span>
				</div>

				<div
					class="relative mx-auto aspect-[2/3] w-full max-w-[140px] rounded-2xl border-2 border-brand-300 bg-gradient-to-b from-brand-50 to-white"
					aria-hidden="true"
				>
					<div class="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 bg-brand-300"></div>
					<div class="absolute inset-y-3 left-1/2 w-0.5 -translate-x-1/2 bg-brand-300"></div>
				</div>

				{#if court.match?.teamA?.length || court.match?.teamB?.length}
					<div class="space-y-1 text-xs text-slate-600">
						{#if court.match?.teamA?.length}
							<p><span class="font-medium text-slate-700">A:</span> {court.match.teamA.join(' · ')}</p>
						{/if}
						{#if court.match?.teamB?.length}
							<p><span class="font-medium text-slate-700">B:</span> {court.match.teamB.join(' · ')}</p>
						{/if}
					</div>
				{:else if court.match?.players?.length}
					<p class="text-xs text-slate-600">{court.match.players.join(' · ')}</p>
				{:else}
					<p class="text-xs text-slate-500">No match assigned</p>
				{/if}

				{#if court.match?.score}
					<p class="text-sm font-medium text-slate-800">Score: {court.match.score}</p>
				{/if}

				{#if court.match?.game}
					<p class="text-xs text-slate-500">Game {court.match.game}</p>
				{/if}
			</div>
		{/if}
	{/each}
</div>
