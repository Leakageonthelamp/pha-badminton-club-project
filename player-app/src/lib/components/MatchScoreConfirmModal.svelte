<script lang="ts">
	import { enhance } from '$app/forms';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import {
		deriveGameWinner,
		deriveMatchWinner,
		formatTeamRoster,
		splitTeams
	} from '@repo/ui/matches';
	import type { MatchWithDetails } from '$lib/types/match';
	import type { SubmitFunction } from '@sveltejs/kit';

	let {
		open = false,
		match = null,
		formAction,
		actionLoading = null,
		isBusy = false,
		handleAction
	}: {
		open?: boolean;
		match: MatchWithDetails | null;
		formAction: string;
		actionLoading?: string | null;
		isBusy?: boolean;
		handleAction: (key: string) => SubmitFunction;
	} = $props();

	const teams = $derived(match ? splitTeams(match.players) : { teamA: [], teamB: [] });
	const sortedGames = $derived(
		match ? [...match.games].sort((a, b) => a.game_no - b.game_no) : []
	);
	const matchWinner = $derived(match ? deriveMatchWinner(match.games) : null);
	const submitterName = $derived.by(() => {
		if (!match?.score_submitted_by) return 'A teammate';
		const submitter = match.players.find((player) => player.user_id === match.score_submitted_by);
		return submitter?.profile?.display_name ?? 'A teammate';
	});
</script>

{#if match}
	<AppModal
		open={open}
		labelledBy="score-confirm-title"
		closeOnBackdrop={false}
		closeOnEscape={false}
		onClose={() => {}}
	>
		<div class="overflow-hidden rounded-2xl bg-white shadow-xl">
			<div class="border-b border-sky-200 bg-gradient-to-br from-sky-50 via-white to-brand-50 px-4 py-5">
				<p class="text-xs font-semibold uppercase tracking-wide text-sky-700">Score check</p>
				<h2 id="score-confirm-title" class="mt-1 text-lg font-semibold text-slate-900">
					Confirm match result
				</h2>
				<p class="mt-2 text-sm leading-relaxed text-slate-600">
					<span class="font-medium text-slate-800">{submitterName}</span> logged this score for
					<span class="font-medium text-slate-800">court {match.court_number}</span>. Accept if it
					matches what you played — reject only if the numbers are wrong.
				</p>
			</div>

			<div class="space-y-3 p-4">
				{#each sortedGames as game (game.game_no)}
					{@const gameWinner = deriveGameWinner(game)}
					<div class="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
						{#if sortedGames.length > 1}
							<p class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
								Game {game.game_no}
							</p>
						{/if}
						<div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
							<div
								class="rounded-lg px-2 py-3 text-center {gameWinner === 'A'
									? 'bg-emerald-50 ring-1 ring-emerald-200'
									: 'bg-white ring-1 ring-slate-200'}"
							>
								<p class="text-xs font-semibold text-slate-700">Team A</p>
								<p class="mt-1 line-clamp-2 text-xs text-slate-500">
									{formatTeamRoster(
										teams.teamA.map((player) => ({
											team: 'A',
											displayName: player.profile?.display_name
										}))
									)}
								</p>
								<p
									class="mt-2 font-mono text-3xl font-bold tabular-nums {gameWinner === 'A'
										? 'text-emerald-700'
										: 'text-slate-900'}"
								>
									{game.team_a_score}
								</p>
							</div>

							<span class="text-sm font-semibold text-slate-400">vs</span>

							<div
								class="rounded-lg px-2 py-3 text-center {gameWinner === 'B'
									? 'bg-emerald-50 ring-1 ring-emerald-200'
									: 'bg-white ring-1 ring-slate-200'}"
							>
								<p class="text-xs font-semibold text-slate-700">Team B</p>
								<p class="mt-1 line-clamp-2 text-xs text-slate-500">
									{formatTeamRoster(
										teams.teamB.map((player) => ({
											team: 'B',
											displayName: player.profile?.display_name
										}))
									)}
								</p>
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
						class="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200"
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
				{/if}
			</div>

			<div class="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2">
				<form method="POST" action={formAction} use:enhance={handleAction('rejectScore')}>
					<input type="hidden" name="match_id" value={match.id} />
					<input type="hidden" name="accept" value="false" />
					<SubmitButton
						variant="secondary"
						loading={actionLoading === 'rejectScore'}
						loadingLabel="Rejecting…"
						disabled={isBusy && actionLoading !== 'rejectScore'}
						class="!w-full"
					>
						Reject score
					</SubmitButton>
				</form>
				<form method="POST" action={formAction} use:enhance={handleAction('acceptScore')}>
					<input type="hidden" name="match_id" value={match.id} />
					<input type="hidden" name="accept" value="true" />
					<SubmitButton
						loading={actionLoading === 'acceptScore'}
						loadingLabel="Accepting…"
						disabled={isBusy && actionLoading !== 'acceptScore'}
						class="!w-full"
					>
						Accept score
					</SubmitButton>
				</form>
			</div>
		</div>
	</AppModal>
{/if}
