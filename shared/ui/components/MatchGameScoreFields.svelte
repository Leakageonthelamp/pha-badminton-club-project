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
		disabled = false,
		viewerTeam = null
	}: {
		gameScores?: Array<GameScoreFields>;
		scoreType: MatchScoreType;
		teamA: MatchPlayerLike[];
		teamB: MatchPlayerLike[];
		disabled?: boolean;
		/** Highlights the viewer's team column so they enter their score on the correct side. */
		viewerTeam?: 'A' | 'B' | null;
	} = $props();

	const teamCellClass = (team: 'A' | 'B', row: 'head' | 'body' | 'foot') => {
		const col = team === 'A' ? 'col-start-1' : 'col-start-3';
		const rowClass =
			row === 'head' ? 'row-start-1 pt-3' : row === 'body' ? 'row-start-2 py-2' : 'row-start-3 pb-3';

		if (viewerTeam === team) {
			const edge =
				row === 'head'
					? 'rounded-t-xl border-2 border-b-0 border-brand-400 bg-brand-50/90'
					: row === 'body'
						? 'border-x-2 border-brand-400 bg-brand-50/90'
						: 'rounded-b-xl border-2 border-t-0 border-brand-400 bg-brand-50/90';
			return `${col} ${rowClass} px-3 ${edge}`;
		}

		if (viewerTeam && viewerTeam !== team) {
			const edge =
				row === 'head'
					? 'rounded-t-xl border border-b-0 border-slate-200 bg-slate-50/50'
					: row === 'body'
						? 'border-x border-slate-200 bg-slate-50/50'
						: 'rounded-b-xl border border-t-0 border-slate-200 bg-slate-50/50';
			return `${col} ${rowClass} px-3 opacity-80 ${edge}`;
		}

		return `${col} ${rowClass} px-1 text-center`;
	};

	const teamHeadingClass = (team: 'A' | 'B') =>
		viewerTeam === team ? 'text-brand-900' : 'text-slate-800';

	const scoreInputClass = (team: 'A' | 'B') =>
		viewerTeam === team ? 'app-score-input ring-2 ring-brand-400' : 'app-score-input';

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
{#if viewerTeam}
	<p class="text-sm font-medium text-brand-800">
		Your team is highlighted — enter <strong>your team's score</strong> on that side.
	</p>
{/if}

<div class="space-y-4">
	{#each gameScores as game, index (index)}
		<div class="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
			{#if gameScores.length > 1}
				<p class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
					Game {index + 1}
				</p>
			{/if}

			<div
				class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] grid-rows-[auto_auto_auto] items-stretch gap-x-3"
			>
				<div class="{teamCellClass('A', 'head')} text-center">
					<p class="text-sm font-semibold {teamHeadingClass('A')}">Team A</p>
					{#if viewerTeam === 'A'}
						<span class="text-xs font-bold text-brand-700">Your team</span>
					{:else if viewerTeam}
						<span class="text-xs invisible" aria-hidden="true">Your team</span>
					{/if}
				</div>

				<span
					class="col-start-2 row-span-3 row-start-1 self-center px-1 text-sm font-semibold text-slate-400"
					>vs</span
				>

				<div class="{teamCellClass('B', 'head')} text-center">
					<p class="text-sm font-semibold {teamHeadingClass('B')}">Team B</p>
					{#if viewerTeam === 'B'}
						<span class="text-xs font-bold text-brand-700">Your team</span>
					{:else if viewerTeam}
						<span class="text-xs invisible" aria-hidden="true">Your team</span>
					{/if}
				</div>

				<div class="{teamCellClass('A', 'body')} text-center">
					<TeamRosterList players={teamA} />
				</div>

				<div class="{teamCellClass('B', 'body')} text-center">
					<TeamRosterList players={teamB} />
				</div>

				<div class="{teamCellClass('A', 'foot')}">
					<input
						class={scoreInputClass('A')}
						type="number"
						min="0"
						inputmode="numeric"
						aria-label={viewerTeam === 'A'
							? `Your team score game ${index + 1}`
							: `Team A score game ${index + 1}`}
						bind:value={game.team_a_score}
						required
						disabled={disabled}
					/>
				</div>

				<div class="{teamCellClass('B', 'foot')}">
					<input
						class={scoreInputClass('B')}
						type="number"
						min="0"
						inputmode="numeric"
						aria-label={viewerTeam === 'B'
							? `Your team score game ${index + 1}`
							: `Team B score game ${index + 1}`}
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
