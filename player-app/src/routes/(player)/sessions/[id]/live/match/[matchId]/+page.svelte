<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { beforeNavigate, goto, invalidate } from '$app/navigation';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import FormToast from '@repo/ui/components/FormToast.svelte';
	import MatchGameScoreFields from '@repo/ui/components/MatchGameScoreFields.svelte';
	import MatchScoreDisplay from '@repo/ui/components/MatchScoreDisplay.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import { formatUptime } from '@repo/ui/datetime';
	import {
		matchScoreResponseBadgeClass,
		matchScoreResponseLabel,
		matchStatusLabel,
		splitTeams,
		validateMatchGames
	} from '@repo/ui/matches';
	import { subscribePostgresChangesWithPollFallback } from '@repo/ui/realtimeSubscribe';
	import { createSupabaseBrowserClient } from '$lib/supabase/client';
	import { clearMatchLiveDismissed, dismissMatchLive } from '$lib/sessions/navigation';
	import MatchScoreConfirmModal from '$lib/components/MatchScoreConfirmModal.svelte';
	import type { MatchGameInput, MatchPlayerWithProfile } from '$lib/types/match';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { ActionData, PageData } from './$types';

	const LIVE_MATCH_PATH = /^\/sessions\/([^/]+)\/live\/match\/([^/]+)$/;

	// Navbar back uses BackLink (plain href) — dismiss auto-open when leaving for session live.
	beforeNavigate(({ from, to }) => {
		if (!browser || !from || !to) return;

		const fromMatch = from.url.pathname.match(LIVE_MATCH_PATH);
		if (!fromMatch) return;

		const sessionId = fromMatch[1];
		const matchId = fromMatch[2];
		if (to.url.pathname !== `/sessions/${sessionId}/live`) return;

		dismissMatchLive(sessionId, matchId);
	});

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let nowMs = $state(Date.now());
	let actionLoading = $state<string | null>(null);
	let backLoading = $state(false);
	let gameScores = $state<Array<{ team_a_score: string; team_b_score: string }>>([]);
	let scoreModalOpen = $state(false);
	let scoreFormError = $state<string | null>(null);

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
	const uptimeLabel = $derived(match.started_at ? formatUptime(match.started_at, nowMs) : '—');
	const myPlayer = $derived(match.players.find((player) => player.user_id === data.userId));
	const canSubmitScore = $derived(match.status === 'active');
	const showScoreConfirm = $derived(
		match.status === 'score_pending' &&
			myPlayer &&
			myPlayer.user_id !== match.score_submitted_by &&
			myPlayer.score_response === 'pending'
	);
	const showScoreResponses = $derived(match.status === 'score_pending');

	const isScoreSubmitter = (player: MatchPlayerWithProfile) =>
		player.user_id === match.score_submitted_by;

	$effect(() => {
		if (scoreModalOpen) return;
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
			`player-match-live-${matchId}`,
			[
				{ table: 'matches', filter: `id=eq.${matchId}` },
				{ table: 'match_players', filter: `match_id=eq.${matchId}` },
				{ table: 'match_games', filter: `match_id=eq.${matchId}` }
			],
			() => void invalidate('app:player-match-live')
		);
	});

	$effect(() => {
		if (match.status === 'completed' || match.status === 'cancelled') {
			clearMatchLiveDismissed(session.id, match.id);
			void goto(`/sessions/${session.id}/live`);
		}
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
					scoreModalOpen = false;
				}
				actionLoading = null;
			};
		};

	const openScoreModal = () => {
		if (isBusy) return;
		gameScores = Array.from({ length: gameCount }, (_, index) => ({
			team_a_score: String(match.games[index]?.team_a_score ?? ''),
			team_b_score: String(match.games[index]?.team_b_score ?? '')
		}));
		scoreFormError = null;
		scoreModalOpen = true;
	};

	const goBack = () => {
		if (isBusy) return;
		dismissMatchLive(session.id, match.id);
		backLoading = true;
		void goto(`/sessions/${session.id}/live`).finally(() => {
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

{#snippet playerRow(player: MatchPlayerWithProfile)}
	<li class="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
		<UserAvatar
			displayName={player.profile?.display_name ?? 'Player'}
			avatarUrl={player.profile?.avatar_url ?? null}
			size="sm"
		/>
		<div class="min-w-0 flex-1">
			<p class="truncate font-medium text-slate-800">
				{player.profile?.display_name ?? 'Player'}
				{#if player.user_id === data.userId}
					<span class="text-slate-500">(you)</span>
				{/if}
			</p>
			<div class="mt-1 flex flex-wrap items-center gap-2">
				{#if player.profile?.tag}
					<TagPill tag={player.profile.tag} />
				{/if}
				{#if showScoreResponses}
					<span
						class="rounded-full px-2.5 py-0.5 text-xs font-semibold {matchScoreResponseBadgeClass(
							player.score_response,
							isScoreSubmitter(player)
						)}"
					>
						{matchScoreResponseLabel(player.score_response, isScoreSubmitter(player))}
					</span>
				{/if}
			</div>
		</div>
	</li>
{/snippet}

<section class="app-page space-y-6">
	<DashboardHero eyebrow="Match live" title={`Court ${match.court_number}`} subtitle={session.name}>
		<span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
			{matchStatusLabel(match.status)}
		</span>
	</DashboardHero>

	<FormToast message={form?.message ?? null} variant={form?.success ? 'success' : 'error'} />

	<div class="grid grid-cols-2 gap-4">
		<AppCard class="space-y-2">
			<p class="text-sm text-slate-500">Match time</p>
			<p class="font-mono text-2xl font-semibold text-slate-900">{uptimeLabel}</p>
		</AppCard>
		<AppCard class="space-y-2">
			<p class="text-sm text-slate-500">Shuttles used</p>
			<p class="text-2xl font-semibold text-slate-900">{match.shuttles_used}</p>
		</AppCard>
	</div>

	{#if match.games.length}
		<MatchScoreDisplay games={match.games} teamA={teamAForScore} teamB={teamBForScore} />
	{/if}

	<AppCard class="space-y-4">
		<h2 class="text-sm font-semibold text-slate-800">Players</h2>
		<div class="space-y-4">
			<div class="space-y-2">
				<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Team A</p>
				<ul class="space-y-2">
					{#each teams.teamA as player (player.id)}
						{@render playerRow(player)}
					{/each}
				</ul>
			</div>
			<div class="space-y-2">
				<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Team B</p>
				<ul class="space-y-2">
					{#each teams.teamB as player (player.id)}
						{@render playerRow(player)}
					{/each}
				</ul>
			</div>
		</div>
	</AppCard>

	{#if canSubmitScore}
		<AppCard class="space-y-3">
			<p class="text-sm text-slate-600">Log the match score when play finishes.</p>
			<SubmitButton type="button" disabled={isBusy} onclick={openScoreModal}>
				Log score
			</SubmitButton>
		</AppCard>
	{:else if match.status === 'suspended'}
		<AppCard>
			<p class="text-sm text-amber-800">Score rejected — waiting for admin to resolve.</p>
		</AppCard>
	{:else if match.status === 'score_pending' && myPlayer?.user_id === match.score_submitted_by}
		<AppCard>
			<p class="text-sm text-slate-600">Waiting for other players to confirm your submitted score.</p>
		</AppCard>
	{/if}

	<SubmitButton
		type="button"
		variant="secondary"
		loading={backLoading}
		loadingLabel="Going back…"
		disabled={isBusy && !backLoading}
		onclick={goBack}
	>
		Back to session live
	</SubmitButton>
</section>

<AppModal
	open={scoreModalOpen}
	labelledBy="log-score-title"
	onClose={() => {
		if (actionLoading === 'submitScore') return;
		scoreModalOpen = false;
		scoreFormError = null;
	}}
>
	<div class="overflow-hidden rounded-2xl bg-white shadow-xl">
		<div class="border-b border-brand-100 bg-brand-50 px-4 py-4">
			<h2 id="log-score-title" class="text-lg font-semibold text-brand-900">Log match score</h2>
			<p class="mt-1 text-sm text-brand-800">
				Court {match.court_number} · play to {match.score_type} points
			</p>
		</div>
		<form
			method="POST"
			action="?/submitScore"
			class="space-y-4 p-4"
			use:enhance={handleAction('submitScore', validateCurrentGames)}
		>
			<MatchGameScoreFields
				bind:gameScores
				scoreType={match.score_type}
				teamA={teamAForScore}
				teamB={teamBForScore}
				viewerTeam={myPlayer?.team ?? null}
				disabled={actionLoading === 'submitScore'}
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
					disabled={actionLoading === 'submitScore'}
					onclick={() => {
						scoreModalOpen = false;
						scoreFormError = null;
					}}
				>
					Cancel
				</SubmitButton>
				<SubmitButton
					loading={actionLoading === 'submitScore'}
					loadingLabel="Submitting…"
					class="!w-auto"
					disabled={!canSubmitScores}
				>
					Submit score
				</SubmitButton>
			</div>
		</form>
	</div>
</AppModal>

<MatchScoreConfirmModal
	open={showScoreConfirm}
	match={showScoreConfirm ? match : null}
	userId={data.userId}
	formAction="/sessions/{session.id}/live?/respondScore"
	actionLoading={actionLoading}
	isBusy={isBusy}
	handleAction={handleAction}
/>
