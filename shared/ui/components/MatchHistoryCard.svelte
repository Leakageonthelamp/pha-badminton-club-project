<script lang="ts">
	import ChevronDownIcon from '../icons/ChevronDownIcon.svelte';
	import { formatDateTime, formatUptime } from '../datetime';
	import {
		deriveMatchWinner,
		formatMatchScore,
		matchStatusBadgeClass,
		matchStatusLabel,
		type MatchGameLike,
		type MatchStatus
	} from '../matches';

	let {
		match,
		onClick
	}: {
		match: {
			court_number: number;
			status: MatchStatus;
			shuttles_used: number;
			started_at: string | null;
			ended_at: string | null;
			games: MatchGameLike[];
		};
		onClick: () => void;
	} = $props();

	const winner = $derived(deriveMatchWinner(match.games));
	const durationLabel = $derived.by(() => {
		if (!match.started_at || !match.ended_at) return null;
		const endedMs = new Date(match.ended_at).getTime();
		if (Number.isNaN(endedMs)) return null;
		return formatUptime(match.started_at, endedMs);
	});
</script>

<button
	type="button"
	class="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/40"
	onclick={onClick}
>
	<div class="min-w-0 flex-1 space-y-2">
		<div class="flex flex-wrap items-center gap-2">
			<p class="font-medium text-slate-900">Court {match.court_number}</p>
			<span
				class="rounded-full px-2 py-0.5 text-xs font-semibold {matchStatusBadgeClass(match.status)}"
			>
				{matchStatusLabel(match.status)}
			</span>
			{#if winner}
				<span class="text-xs font-medium text-emerald-700">Team {winner} won</span>
			{/if}
		</div>
		{#if match.games.length}
			<div class="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
				<p
					class="font-mono text-xl font-bold leading-none tabular-nums tracking-tight text-slate-900 sm:text-2xl"
				>
					{formatMatchScore(match.games)}
				</p>
			</div>
		{/if}
		<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
			{#if durationLabel}
				<span>
					Duration
					<span class="font-mono font-semibold tabular-nums text-slate-700">{durationLabel}</span>
				</span>
			{/if}
			<span>{match.shuttles_used} shuttle{match.shuttles_used === 1 ? '' : 's'}</span>
			{#if match.ended_at}
				<span>{formatDateTime(match.ended_at)}</span>
			{/if}
		</div>
	</div>
	<ChevronDownIcon class="h-5 w-5 shrink-0 -rotate-90 text-slate-400" />
</button>
