<script lang="ts">
	import { t } from '$lib/i18n';
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import FormToast from '@repo/ui/components/FormToast.svelte';
	import MatchGameScoreFields from '@repo/ui/components/MatchGameScoreFields.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import { formatUptime } from '@repo/ui/datetime';
	import {
		deriveMatchWinner,
		formatMatchScore,
		isMatchDraw,
		matchStatusLabel,
		splitTeams,
		validateMatchGames
	} from '@repo/ui/matches';
	import { subscribePostgresChangesWithPollFallback } from '@repo/ui/realtimeSubscribe';
	import { createSupabaseBrowserClient } from '$lib/supabase/client';
	import type { MatchGameInput } from '$lib/types/match';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let nowMs = $state(Date.now());
	let actionLoading = $state<string | null>(null);
	let backLoading = $state(false);
	let endWithScoreModalOpen = $state(false);
	let endNoScoreModalOpen = $state(false);
	let scoreFormError = $state<string | null>(null);
	let gameScores = $state<Array<{ team_a_score: string; team_b_score: string }>>([]);

	const isBusy = $derived(actionLoading !== null || backLoading);

	const session = $derived(data.session);
	const match = $derived(data.match);
	const teams = $derived(splitTeams(match.players));
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
	const gameCount = $derived(match.round_type === 'two_round' ? 2 : 1);
	const uptimeLabel = $derived(
		match.started_at ? formatUptime(match.started_at, nowMs) : '—'
	);
	const winner = $derived(deriveMatchWinner(match.games));
	const matchDraw = $derived(isMatchDraw(match.games));

	$effect(() => {
		gameScores = Array.from({ length: gameCount }, (_, index) => ({
			team_a_score: String(match.games[index]?.team_a_score ?? ''),
			team_b_score: String(match.games[index]?.team_b_score ?? '')
		}));
	});

	$effect(() => {
		if (!browser) return;
		const timer = window.setInterval(() => {
			nowMs = Date.now();
		}, 1_000);
		return () => window.clearInterval(timer);
	});

	$effect(() => {
		if (!browser) return;

		const supabase = createSupabaseBrowserClient();
		const matchId = match.id;

		return subscribePostgresChangesWithPollFallback(
			supabase,
			`admin-match-control-${matchId}`,
			[
				{ table: 'matches', filter: `id=eq.${matchId}` },
				{ table: 'match_players', filter: `match_id=eq.${matchId}` },
				{ table: 'match_games', filter: `match_id=eq.${matchId}` }
			],
			() => void invalidate('app:session-match-control')
		);
	});

	const handleAction =
		(key: string, validate?: () => string | null): SubmitFunction =>
		({ cancel }) => {
			if (validate) {
				const error = validate();
				if (error) {
					scoreFormError = error;
					cancel();
					return;
				}
			}

			scoreFormError = null;
			actionLoading = key;
			return async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'redirect') {
					await goto(result.location);
				} else if (result.type === 'success') {
					endWithScoreModalOpen = false;
					endNoScoreModalOpen = false;
				}
				actionLoading = null;
			};
		};

	const openEndWithScoreModal = () => {
		if (isBusy) return;
		gameScores = Array.from({ length: gameCount }, (_, index) => ({
			team_a_score: String(match.games[index]?.team_a_score ?? ''),
			team_b_score: String(match.games[index]?.team_b_score ?? '')
		}));
		scoreFormError = null;
		endWithScoreModalOpen = true;
	};

	const goBack = () => {
		if (isBusy) return;
		backLoading = true;
		void goto(`/sessions/${session.id}/control`).finally(() => {
			backLoading = false;
		});
	};

	const buildGames = (): MatchGameInput[] =>
		gameScores.map((game, index) => ({
			game_no: index + 1,
			team_a_score: Number(game.team_a_score),
			team_b_score: Number(game.team_b_score)
		}));

	const validateCurrentGames = (): string | null =>
		validateMatchGames(buildGames(), match.round_type, match.score_type);

	const canSubmitScores = $derived.by(() => {
		if (gameScores.some((game) => game.team_a_score === '' || game.team_b_score === '')) {
			return false;
		}
		return validateCurrentGames() === null;
	});

	const gamesJson = $derived(JSON.stringify(buildGames()));
</script>

<section class="app-page space-y-6">
	<DashboardHero
		eyebrow={t('match.eyebrow')}
		title={`Court ${match.court_number}`}
		subtitle={session.name}
	>
		<span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 dark:text-slate-600">
			{matchStatusLabel(match.status)}
		</span>
	</DashboardHero>

	<FormToast message={form?.message ?? null} variant={form?.success ? 'success' : 'error'} />

	<div class="grid gap-4 sm:grid-cols-2">
		<AppCard class="space-y-2">
			<p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('match.time')}</p>
			<p class="font-mono text-2xl font-semibold text-slate-900 dark:text-slate-100">{uptimeLabel}</p>
		</AppCard>
		<AppCard class="space-y-2">
			<p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('match.shuttlesUsed')}</p>
			<p class="font-mono text-2xl font-semibold text-slate-900 dark:text-slate-100">{match.shuttles_used}</p>
		</AppCard>
	</div>

	{#if match.status === 'active'}
		<AppCard class="overflow-hidden border border-brand-200 bg-gradient-to-br from-brand-50/80 to-white">
			<div class="space-y-3">
				<div>
					<p class="text-sm font-semibold text-brand-900">{t('match.logShuttle')}</p>
					<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
						Tap below each time a new shuttle is opened during this match.
					</p>
				</div>
				<form method="POST" action="?/addShuttle" use:enhance={handleAction('addShuttle')}>
					<SubmitButton
						loading={actionLoading === 'addShuttle'}
						loadingLabel={t('match.addingShuttle')}
						disabled={isBusy && actionLoading !== 'addShuttle'}
						class="!w-full py-3.5 text-base font-semibold"
					>
						Add shuttle
					</SubmitButton>
				</form>
			</div>
		</AppCard>
	{/if}

	<div class="grid gap-4 md:grid-cols-2">
		<AppCard class="space-y-3">
			<h2 class="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('match.teamA')}</h2>
			<ul class="space-y-2">
				{#each teams.teamA as player (player.id)}
					<li class="flex items-center gap-3">
						<UserAvatar
							displayName={player.profile?.display_name ?? t('role.player')}
							avatarUrl={player.profile?.avatar_url ?? null}
							size="sm"
						/>
						<div>
							<p class="font-medium text-slate-800 dark:text-slate-200">{player.profile?.display_name ?? t('role.player')}</p>
							{#if player.profile?.tag}
								<TagPill tag={player.profile.tag} />
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		</AppCard>
		<AppCard class="space-y-3">
			<h2 class="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('match.teamB')}</h2>
			<ul class="space-y-2">
				{#each teams.teamB as player (player.id)}
					<li class="flex items-center gap-3">
						<UserAvatar
							displayName={player.profile?.display_name ?? t('role.player')}
							avatarUrl={player.profile?.avatar_url ?? null}
							size="sm"
						/>
						<div>
							<p class="font-medium text-slate-800 dark:text-slate-200">{player.profile?.display_name ?? t('role.player')}</p>
							{#if player.profile?.tag}
								<TagPill tag={player.profile.tag} />
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		</AppCard>
	</div>

	{#if match.games.length}
		<AppCard class="space-y-2">
			<h2 class="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('match.currentScore')}</h2>
			<p class="text-lg font-medium text-slate-900 dark:text-slate-100">{formatMatchScore(match.games)}</p>
			{#if winner}
				<p class="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">Winner: Team {winner}</p>
			{:else if matchDraw}
				<p class="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">{t('match.drawn')}</p>
			{/if}
		</AppCard>
	{/if}

	{#if match.status === 'active'}
		<AppCard class="space-y-3">
			<div>
				<h2 class="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('match.endMatch')}</h2>
				<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
					When play is finished, log the score or end without one.
				</p>
			</div>
			<div class="grid gap-3 sm:grid-cols-2">
				<SubmitButton
					type="button"
					variant="secondary"
					disabled={isBusy}
					onclick={openEndWithScoreModal}
				>
					End with score
				</SubmitButton>
				<SubmitButton
					type="button"
					variant="secondary"
					disabled={isBusy}
					onclick={() => {
						if (isBusy) return;
						endNoScoreModalOpen = true;
					}}
				>
					End without score
				</SubmitButton>
			</div>
		</AppCard>
	{:else if match.status === 'suspended'}
		<AppCard class="space-y-4">
			<p class="text-sm text-amber-800">
				A player rejected the submitted score. Enter the final score to complete the match.
			</p>
			<form
				method="POST"
				action="?/resolveScore"
				use:enhance={handleAction('resolveScore', validateCurrentGames)}
				class="space-y-3"
			>
				<MatchGameScoreFields
					bind:gameScores
					scoreType={match.score_type}
					teamA={teamAForScore}
					teamB={teamBForScore}
					disabled={actionLoading === 'resolveScore'}
				/>
				{#if scoreFormError}
					<p class="text-sm text-rose-700">{scoreFormError}</p>
				{/if}
				<input type="hidden" name="games_json" value={gamesJson} />
				<SubmitButton
					loading={actionLoading === 'resolveScore'}
					loadingLabel={t('match.resolvingScore')}
					disabled={!canSubmitScores}
				>
					Resolve score
				</SubmitButton>
			</form>
		</AppCard>
	{:else if match.status === 'score_pending'}
		<AppCard>
			<p class="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">{t('match.waitingConfirm')}</p>
		</AppCard>
	{/if}

	<SubmitButton
		type="button"
		variant="secondary"
		loading={backLoading}
		loadingLabel={t('match.goingBack')}
		disabled={isBusy && !backLoading}
		onclick={goBack}
	>
		Back to session control
	</SubmitButton>
</section>

{#if endWithScoreModalOpen}
	<AppModal
		open={endWithScoreModalOpen}
		labelledBy="end-with-score-modal-title"
		onClose={() => {
			endWithScoreModalOpen = false;
			scoreFormError = null;
		}}
	>
		<div class="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-xl">
			<div class="border-b border-brand-100 bg-brand-50 px-4 py-4">
				<h2 id="end-with-score-modal-title" class="text-lg font-semibold text-brand-900">
					End match with score
				</h2>
				<p class="mt-1 text-sm text-brand-800">
					Court {match.court_number} · play to {match.score_type} points
				</p>
			</div>
			<form
				method="POST"
				action="?/endWithScore"
				class="space-y-4 p-4"
				use:enhance={handleAction('endWithScore', validateCurrentGames)}
			>
				<MatchGameScoreFields
					bind:gameScores
					scoreType={match.score_type}
					teamA={teamAForScore}
					teamB={teamBForScore}
					disabled={actionLoading === 'endWithScore'}
				/>
				{#if scoreFormError}
					<p class="text-sm text-rose-700">{scoreFormError}</p>
				{/if}
				<input type="hidden" name="games_json" value={gamesJson} />
				<div class="flex flex-wrap justify-end gap-2">
					<SubmitButton
						type="button"
						variant="secondary"
						class="!w-auto"
						disabled={actionLoading === 'endWithScore'}
						onclick={() => {
							endWithScoreModalOpen = false;
							scoreFormError = null;
						}}
					>
						Cancel
					</SubmitButton>
					<SubmitButton
						loading={actionLoading === 'endWithScore'}
						loadingLabel={t('match.endingMatch')}
						class="!w-auto"
						disabled={!canSubmitScores}
					>
						End with score
					</SubmitButton>
				</div>
			</form>
		</div>
	</AppModal>
{/if}

{#if endNoScoreModalOpen}
	<AppModal
		open={endNoScoreModalOpen}
		labelledBy="end-no-score-modal-title"
		onClose={() => (endNoScoreModalOpen = false)}
	>
		<div class="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-xl">
			<div class="border-b border-amber-200 bg-amber-50 px-4 py-4">
				<h2 id="end-no-score-modal-title" class="text-lg font-semibold text-amber-900">
					End without score?
				</h2>
				<p class="mt-2 text-sm text-amber-900">
					This ends the match on court {match.court_number} with no recorded score. Players return to
					idle and the court is freed. This cannot be undone.
				</p>
			</div>
			<form
				method="POST"
				action="?/endNoScore"
				class="flex flex-wrap justify-end gap-2 p-4"
				use:enhance={handleAction('endNoScore')}
			>
				<SubmitButton
					type="button"
					variant="secondary"
					class="!w-auto"
					disabled={actionLoading === 'endNoScore'}
					onclick={() => (endNoScoreModalOpen = false)}
				>
					Cancel
				</SubmitButton>
				<SubmitButton
					loading={actionLoading === 'endNoScore'}
					loadingLabel={t('match.endingMatch')}
					class="!w-auto"
				>
					End without score
				</SubmitButton>
			</form>
		</div>
	</AppModal>
{/if}
