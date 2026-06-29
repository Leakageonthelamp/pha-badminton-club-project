<script lang="ts">
	import TeamRosterList from './TeamRosterList.svelte';
	import {
		rallyScoreHint,
		validateRallyGameScore,
		type MatchPlayerLike,
		type MatchScoreType
	} from '../matches';

	type GameScoreFields = {
		team_a_score: string;
		team_b_score: string;
	};

	let {
		gameScores = $bindable<Array<GameScoreFields>>([]),
		scoreType,
		teamA,
		teamB,
		disabled = false
	}: {
		gameScores?: Array<GameScoreFields>;
		scoreType: MatchScoreType;
		teamA: MatchPlayerLike[];
		teamB: MatchPlayerLike[];
		disabled?: boolean;
	} = $props();

	const gameErrors = $derived(
		gameScores.map((game) => {
			if (game.team_a_score === '' || game.team_b_score === '') return null;
			return validateRallyGameScore(
				Number(game.team_a_score),
				Number(game.team_b_score),
				scoreType
			);
		})
	);
</script>

<p class="text-sm text-slate-600">{rallyScoreHint(scoreType)}</p>

<div class="space-y-4">
	{#each gameScores as game, index (index)}
		<div class="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
			{#if gameScores.length > 1}
				<p class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
					Game {index + 1}
				</p>
			{/if}

			<div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
				<div class="space-y-2 text-center">
					<p class="text-sm font-semibold text-slate-800">Team A</p>
					<TeamRosterList players={teamA} />
					<input
						class="app-score-input"
						type="number"
						min="0"
						inputmode="numeric"
						aria-label="Team A score game {index + 1}"
						bind:value={game.team_a_score}
						required
						disabled={disabled}
					/>
				</div>

				<span class="px-1 text-sm font-semibold text-slate-400">vs</span>

				<div class="space-y-2 text-center">
					<p class="text-sm font-semibold text-slate-800">Team B</p>
					<TeamRosterList players={teamB} />
					<input
						class="app-score-input"
						type="number"
						min="0"
						inputmode="numeric"
						aria-label="Team B score game {index + 1}"
						bind:value={game.team_b_score}
						required
						disabled={disabled}
					/>
				</div>
			</div>

			{#if gameErrors[index]}
				<p class="mt-3 text-sm text-rose-700">{gameErrors[index]}</p>
			{/if}
		</div>
	{/each}
</div>
