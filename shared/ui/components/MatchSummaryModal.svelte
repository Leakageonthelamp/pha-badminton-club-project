<script lang="ts">
	import AppModal from './AppModal.svelte';
	import MatchScoreDisplay from './MatchScoreDisplay.svelte';
	import TagPill from './TagPill.svelte';
	import UserAvatar from './UserAvatar.svelte';
	import { formatUptime } from '../datetime';
	import {
		deriveMatchWinner,
		matchStatusBadgeClass,
		matchStatusLabel,
		splitTeams,
		type MatchGameLike,
		type MatchStatus,
		type MatchTeam
	} from '../matches';

	export type MatchSummaryLike = {
		court_number: number;
		status: MatchStatus;
		shuttles_used: number;
		started_at: string | null;
		ended_at: string | null;
		games: MatchGameLike[];
		players: Array<{
			team: MatchTeam;
			user_id?: string;
			profile: {
				display_name: string | null;
				tag: string | null;
				avatar_url: string | null;
			} | null;
		}>;
	};

	let {
		open = false,
		match = null,
		highlightUserId = null,
		sessionName = null,
		sessionHref = null,
		onClose
	}: {
		open?: boolean;
		match: MatchSummaryLike | null;
		highlightUserId?: string | null;
		sessionName?: string | null;
		sessionHref?: string | null;
		onClose: () => void;
	} = $props();

	const teams = $derived(match ? splitTeams(match.players) : { teamA: [], teamB: [] });
	const matchWinner = $derived(match ? deriveMatchWinner(match.games) : null);
	const teamAForScore = $derived(
		teams.teamA.map((player) => ({
			team: 'A' as const,
			displayName: player.profile?.display_name
		}))
	);
	const teamBForScore = $derived(
		teams.teamB.map((player) => ({
			team: 'B' as const,
			displayName: player.profile?.display_name
		}))
	);
	const durationLabel = $derived.by(() => {
		if (!match?.started_at || !match.ended_at) return null;
		const endedMs = new Date(match.ended_at).getTime();
		if (Number.isNaN(endedMs)) return null;
		return formatUptime(match.started_at, endedMs);
	});
</script>

{#if match}
	<AppModal open={open} labelledBy="match-summary-title" onClose={onClose}>
		<div class="overflow-hidden rounded-2xl bg-white shadow-xl">
			<div class="border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-brand-50/40 px-4 py-4">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Match summary</p>
						<h2 id="match-summary-title" class="mt-1 text-lg font-semibold text-slate-900">
							Court {match.court_number}
						</h2>
						{#if matchWinner}
							<p class="mt-1 text-sm text-emerald-700">Team {matchWinner} won</p>
						{/if}
					</div>
					<span
						class="rounded-full px-2.5 py-1 text-xs font-semibold {matchStatusBadgeClass(
							match.status
						)}"
					>
						{matchStatusLabel(match.status)}
					</span>
				</div>
				<div class="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
					{#if durationLabel}
						<span class="font-mono tabular-nums">{durationLabel}</span>
					{/if}
					<span>
						{match.shuttles_used} shuttle{match.shuttles_used === 1 ? '' : 's'}
					</span>
					{#if sessionName && sessionHref}
						<a
							href={sessionHref}
							class="font-medium text-brand-700 hover:text-brand-800"
							onclick={onClose}
						>
							{sessionName} →
						</a>
					{/if}
				</div>
			</div>

			{#if match.games.length}
				<div class="border-b border-slate-100 p-4">
					<MatchScoreDisplay
						games={match.games}
						teamA={teamAForScore}
						teamB={teamBForScore}
						heading={null}
						embedded
					/>
				</div>
			{/if}

			<div class="space-y-4 p-4">
				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Team A</p>
					<ul class="space-y-2">
						{#each teams.teamA as player (player.user_id ?? player.profile?.display_name)}
							<li class="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
								<UserAvatar
									displayName={player.profile?.display_name ?? 'Player'}
									avatarUrl={player.profile?.avatar_url ?? null}
									size="sm"
								/>
								<div class="min-w-0 flex-1">
									<p class="truncate font-medium text-slate-800">
										{player.profile?.display_name ?? 'Player'}
										{#if highlightUserId && player.user_id === highlightUserId}
											<span class="text-slate-500">(you)</span>
										{/if}
									</p>
									{#if player.profile?.tag}
										<TagPill tag={player.profile.tag} class="mt-1" />
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				</div>
				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Team B</p>
					<ul class="space-y-2">
						{#each teams.teamB as player (player.user_id ?? player.profile?.display_name)}
							<li class="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
								<UserAvatar
									displayName={player.profile?.display_name ?? 'Player'}
									avatarUrl={player.profile?.avatar_url ?? null}
									size="sm"
								/>
								<div class="min-w-0 flex-1">
									<p class="truncate font-medium text-slate-800">
										{player.profile?.display_name ?? 'Player'}
										{#if highlightUserId && player.user_id === highlightUserId}
											<span class="text-slate-500">(you)</span>
										{/if}
									</p>
									{#if player.profile?.tag}
										<TagPill tag={player.profile.tag} class="mt-1" />
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	</AppModal>
{/if}
