<script lang="ts">
	import AppCard from './AppCard.svelte';
	import TeamRosterList from './TeamRosterList.svelte';
	import {
		deriveGameWinner,
		deriveMatchWinner,
		isMatchDraw,
		type MatchGameLike,
		type MatchPlayerLike
	} from '../matches';

	let {
		games,
		teamA,
		teamB,
		heading = 'Match score',
		embedded = false,
		viewerTeam = null
	}: {
		games: MatchGameLike[];
		teamA: MatchPlayerLike[];
		teamB: MatchPlayerLike[];
		heading?: string | null;
		/** No outer card — for use inside modals */
		embedded?: boolean;
		/** Highlights the viewer's team on the scoreboard. */
		viewerTeam?: 'A' | 'B' | null;
	} = $props();

	const sortedGames = $derived([...games].sort((a, b) => a.game_no - b.game_no));
	const matchWinner = $derived(deriveMatchWinner(games));
	const matchDraw = $derived(isMatchDraw(games));

	const teamPanelClass = (team: 'A' | 'B', gameWinner: 'A' | 'B' | null) => {
		if (gameWinner === team) {
			return viewerTeam === team
				? 'bg-emerald-50 ring-2 ring-emerald-300'
				: 'bg-emerald-50 ring-1 ring-emerald-200';
		}
		if (viewerTeam === team) {
			return 'bg-brand-50/90 ring-2 ring-brand-400';
		}
		return 'bg-white ring-1 ring-slate-200';
	};
</script>

{#snippet scoreBody()}
	<div class="space-y-3" class:p-4={!embedded}>
		{#each sortedGames as game (game.game_no)}
			{@const gameWinner = deriveGameWinner(game)}
			<div class="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
				{#if sortedGames.length > 1}
					<p class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
						Game {game.game_no}
					</p>
				{/if}
				<div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-3">
					<div class="rounded-lg px-2 py-3 text-center {teamPanelClass('A', gameWinner)}">
						<p class="text-xs font-semibold text-slate-700">Team A</p>
						{#if viewerTeam === 'A'}
							<p class="text-xs font-bold text-brand-700">Your team</p>
						{:else if viewerTeam}
							<p class="text-xs invisible" aria-hidden="true">Your team</p>
						{/if}
						<TeamRosterList players={teamA} />
						<p
							class="mt-2 font-mono text-3xl font-bold tabular-nums {gameWinner === 'A'
								? 'text-emerald-700'
								: 'text-slate-900'}"
						>
							{game.team_a_score}
						</p>
					</div>

					<span class="self-center text-sm font-semibold text-slate-400">vs</span>

					<div class="rounded-lg px-2 py-3 text-center {teamPanelClass('B', gameWinner)}">
						<p class="text-xs font-semibold text-slate-700">Team B</p>
						{#if viewerTeam === 'B'}
							<p class="text-xs font-bold text-brand-700">Your team</p>
						{:else if viewerTeam}
							<p class="text-xs invisible" aria-hidden="true">Your team</p>
						{/if}
						<TeamRosterList players={teamB} />
						<p
							class="mt-2 font-mono text-3xl font-bold tabular-nums {gameWinner === 'B'
								? 'text-emerald-700'
								: 'text-slate-900'}"
						>
							{game.team_b_score}
						</p>
					</div>
				</div>
			</div>
		{/each}

		{#if matchWinner}
			<div
				class="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200"
			>
				<span
					class="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white"
					aria-hidden="true"
				>
					<svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
							clip-rule="evenodd"
						/>
					</svg>
				</span>
				Team {matchWinner} wins the match
			</div>
		{:else if matchDraw}
			<div
				class="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
			>
				Match drawn
			</div>
		{/if}
	</div>
{/snippet}

{#if embedded}
	{@render scoreBody()}
{:else}
	<AppCard padded={false} class="overflow-hidden">
		{#if heading}
			<div
				class="border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-brand-50/50 px-4 py-3.5"
			>
				<h2 class="text-sm font-semibold text-slate-900">{heading}</h2>
				{#if matchWinner}
					<p class="mt-0.5 text-xs text-slate-600">Team {matchWinner} leads the match</p>
				{:else if matchDraw}
					<p class="mt-0.5 text-xs text-slate-600">Match drawn</p>
				{/if}
			</div>
		{/if}
		{@render scoreBody()}
	</AppCard>
{/if}
