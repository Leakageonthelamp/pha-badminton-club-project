<script lang="ts">
	import ChevronDownIcon from '../icons/ChevronDownIcon.svelte';
	import { formatDateTime, formatUptime } from '../datetime';
	import {
		deriveGameWinner,
		findPlayerTeam,
		playerMatchResult,
		type MatchGameLike,
		type MatchPlayerUserLike
	} from '../matches';

	let {
		match,
		userId,
		matchNumber,
		onClick,
		compact = false
	}: {
		match: {
			shuttles_used: number;
			started_at: string | null;
			ended_at: string | null;
			games: MatchGameLike[];
			players: MatchPlayerUserLike[];
		};
		userId: string;
		matchNumber: number;
		onClick: () => void;
		/** Smaller padding — for nested lists inside roster accordions */
		compact?: boolean;
	} = $props();

	const playerTeam = $derived(findPlayerTeam(userId, match.players));
	const result = $derived(playerMatchResult(userId, match.players, match.games));
	const sortedGames = $derived([...match.games].sort((a, b) => a.game_no - b.game_no));
	const primaryGame = $derived(sortedGames[0]);
	const durationLabel = $derived.by(() => {
		if (!match.started_at || !match.ended_at) return null;
		const endedMs = new Date(match.ended_at).getTime();
		if (Number.isNaN(endedMs)) return null;
		return formatUptime(match.started_at, endedMs);
	});
</script>

<button
	type="button"
	class="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white text-left transition-colors hover:border-brand-200 hover:bg-brand-50/40 {compact
		? 'px-2.5 py-2'
		: 'rounded-xl px-3 py-3'}"
	onclick={onClick}
>
	<div class="min-w-0 flex-1 space-y-1.5">
		<div class="flex flex-wrap items-center gap-1.5">
			<p class="{compact ? 'text-sm' : 'text-base'} font-medium text-slate-900">
				Match {matchNumber}
			</p>
			{#if result}
				<span
					class="rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide {result ===
					'win'
						? 'bg-emerald-100 text-emerald-800'
						: 'bg-rose-100 text-rose-800'}"
				>
					{result === 'win' ? 'Win' : 'Loss'}
				</span>
			{/if}
		</div>
		{#if primaryGame && playerTeam}
			{@const gameWinner = deriveGameWinner(primaryGame)}
			{@const playerWonGame = playerTeam === gameWinner}
			{@const playerScore =
				playerTeam === 'A' ? primaryGame.team_a_score : primaryGame.team_b_score}
			{@const opponentScore =
				playerTeam === 'A' ? primaryGame.team_b_score : primaryGame.team_a_score}
			<div class="flex items-center gap-2">
				<div
					class="rounded-md px-2 py-1 text-center ring-1 {playerWonGame
						? 'bg-emerald-50 ring-emerald-200'
						: 'bg-slate-50 ring-slate-200'}"
				>
					<p class="text-[0.6rem] font-semibold uppercase tracking-wide text-slate-500">You</p>
					<p
						class="font-mono text-lg font-bold tabular-nums leading-none {playerWonGame
							? 'text-emerald-700'
							: 'text-slate-900'}"
					>
						{playerScore}
					</p>
				</div>
				<span class="text-[0.65rem] font-semibold text-slate-400">vs</span>
				<div
					class="rounded-md px-2 py-1 text-center ring-1 {gameWinner && !playerWonGame
						? 'bg-emerald-50 ring-emerald-200'
						: 'bg-slate-50 ring-slate-200'}"
				>
					<p class="text-[0.6rem] font-semibold uppercase tracking-wide text-slate-500">Opp</p>
					<p
						class="font-mono text-lg font-bold tabular-nums leading-none {gameWinner &&
						!playerWonGame
							? 'text-emerald-700'
							: 'text-slate-900'}"
					>
						{opponentScore}
					</p>
				</div>
				{#if sortedGames.length > 1}
					<span class="text-[0.65rem] text-slate-500">
						+{sortedGames.length - 1} more game{sortedGames.length - 1 === 1 ? '' : 's'}
					</span>
				{/if}
			</div>
		{/if}
		<div
			class="flex flex-wrap items-center gap-x-2 gap-y-0.5 {compact
				? 'text-[0.65rem]'
				: 'text-xs'} text-slate-500"
		>
			{#if durationLabel}
				<span class="font-mono tabular-nums text-slate-600">{durationLabel}</span>
			{/if}
			<span>{match.shuttles_used} shuttle{match.shuttles_used === 1 ? '' : 's'}</span>
			{#if match.ended_at}
				<span>{formatDateTime(match.ended_at)}</span>
			{/if}
		</div>
	</div>
	<ChevronDownIcon
		class="{compact ? 'h-4 w-4' : 'h-5 w-5'} shrink-0 -rotate-90 text-slate-400"
	/>
</button>
