<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import FormToast from '@repo/ui/components/FormToast.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import { formatUptime } from '@repo/ui/datetime';
	import {
		deriveMatchWinner,
		formatMatchScore,
		matchStatusLabel,
		splitTeams
	} from '@repo/ui/matches';
	import { createSupabaseBrowserClient } from '$lib/supabase/client';
	import type { MatchGameInput } from '$lib/types/match';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let nowMs = $state(Date.now());
	let actionLoading = $state<string | null>(null);
	let gameScores = $state<Array<{ team_a_score: string; team_b_score: string }>>([]);
	let scoreModalOpen = $state(false);

	const session = $derived(data.session);
	const match = $derived(data.match);
	const teams = $derived(splitTeams(match.players));
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
		const invalidateMatch = () => void invalidate('app:player-match-live');

		const channel = supabase
			.channel(`player-match-live-${match.id}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'matches', filter: `id=eq.${match.id}` },
				invalidateMatch
			)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'match_players', filter: `match_id=eq.${match.id}` },
				invalidateMatch
			)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'match_games', filter: `match_id=eq.${match.id}` },
				invalidateMatch
			)
			.subscribe();

		return () => {
			void supabase.removeChannel(channel);
		};
	});

	$effect(() => {
		if (match.status === 'completed' || match.status === 'cancelled') {
			void goto(`/sessions/${session.id}/live`);
		}
	});

	const handleAction =
		(key: string): SubmitFunction =>
		() => {
			actionLoading = key;
			return async ({ result, update }) => {
				await update({ reset: false });
				actionLoading = null;
				if (result.type === 'success') {
					scoreModalOpen = false;
				}
			};
		};

	const buildGames = (): MatchGameInput[] =>
		gameScores.map((game, index) => ({
			game_no: index + 1,
			team_a_score: Number(game.team_a_score),
			team_b_score: Number(game.team_b_score)
		}));

	const gamesJson = $derived(JSON.stringify(buildGames()));
</script>

<section class="app-page space-y-6">
	<DashboardHero eyebrow="Match live" title={`Court ${match.court_number}`} subtitle={session.name}>
		<span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
			{matchStatusLabel(match.status)}
		</span>
	</DashboardHero>

	<FormToast message={form?.message ?? null} variant={form?.success ? 'success' : 'error'} />

	<div class="grid gap-4 sm:grid-cols-2">
		<AppCard class="space-y-2">
			<p class="text-sm text-slate-500">Match time</p>
			<p class="font-mono text-2xl font-semibold text-slate-900">{uptimeLabel}</p>
		</AppCard>
		<AppCard class="space-y-2">
			<p class="text-sm text-slate-500">Shuttles used</p>
			<p class="text-2xl font-semibold text-slate-900">{match.shuttles_used}</p>
		</AppCard>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<AppCard class="space-y-3">
			<h2 class="text-sm font-semibold text-slate-800">Team A</h2>
			<ul class="space-y-2">
				{#each teams.teamA as player (player.id)}
					<li class="flex items-center gap-3">
						<UserAvatar
							displayName={player.profile?.display_name ?? 'Player'}
							avatarUrl={player.profile?.avatar_url ?? null}
							size="sm"
						/>
						<div>
							<p class="font-medium text-slate-800">{player.profile?.display_name ?? 'Player'}</p>
							{#if player.profile?.tag}
								<TagPill tag={player.profile.tag} />
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		</AppCard>
		<AppCard class="space-y-3">
			<h2 class="text-sm font-semibold text-slate-800">Team B</h2>
			<ul class="space-y-2">
				{#each teams.teamB as player (player.id)}
					<li class="flex items-center gap-3">
						<UserAvatar
							displayName={player.profile?.display_name ?? 'Player'}
							avatarUrl={player.profile?.avatar_url ?? null}
							size="sm"
						/>
						<div>
							<p class="font-medium text-slate-800">{player.profile?.display_name ?? 'Player'}</p>
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
			<h2 class="text-sm font-semibold text-slate-800">Score</h2>
			<p class="text-lg font-medium text-slate-900">{formatMatchScore(match.games)}</p>
			{#if deriveMatchWinner(match.games)}
				<p class="text-sm text-slate-600">Winner: Team {deriveMatchWinner(match.games)}</p>
			{/if}
		</AppCard>
	{/if}

	{#if canSubmitScore}
		<AppCard class="space-y-3">
			<p class="text-sm text-slate-600">Log the match score when play finishes.</p>
			<SubmitButton type="button" onclick={() => (scoreModalOpen = true)}>Log score</SubmitButton>
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

	<SubmitButton type="button" variant="secondary" onclick={() => goto(`/sessions/${session.id}/live`)}>
		Back to session live
	</SubmitButton>
</section>

<AppModal open={scoreModalOpen} labelledBy="log-score-title" onClose={() => (scoreModalOpen = false)}>
	<div class="app-card-padded space-y-4">
		<h2 id="log-score-title" class="text-lg font-semibold text-slate-900">Log match score</h2>
		<form method="POST" action="?/submitScore" use:enhance={handleAction('submitScore')} class="space-y-3">
			{#each gameScores as game, index (index)}
				<div class="grid grid-cols-2 gap-3">
					<label class="space-y-1">
						<span class="text-xs font-medium text-slate-600">Game {index + 1} — Team A</span>
						<input class="app-input" type="number" min="0" bind:value={game.team_a_score} required />
					</label>
					<label class="space-y-1">
						<span class="text-xs font-medium text-slate-600">Game {index + 1} — Team B</span>
						<input class="app-input" type="number" min="0" bind:value={game.team_b_score} required />
					</label>
				</div>
			{/each}
			<input type="hidden" name="games_json" value={gamesJson} />
			<div class="flex justify-end gap-2">
				<SubmitButton type="button" variant="secondary" onclick={() => (scoreModalOpen = false)}>
					Cancel
				</SubmitButton>
				<SubmitButton loading={actionLoading === 'submitScore'}>Submit score</SubmitButton>
			</div>
		</form>
	</div>
</AppModal>

<AppModal open={showScoreConfirm} labelledBy="score-confirm-title" onClose={() => {}}>
	<div class="app-card-padded space-y-4">
		<h2 id="score-confirm-title" class="text-lg font-semibold text-slate-900">Confirm score result</h2>
		{#if match.games.length}
			<p class="text-sm text-slate-600">{formatMatchScore(match.games)}</p>
		{/if}
		<div class="flex justify-end gap-2">
			<form method="POST" action="/sessions/{session.id}/live?/respondScore" use:enhance={handleAction('rejectScore')}>
				<input type="hidden" name="match_id" value={match.id} />
				<input type="hidden" name="accept" value="false" />
				<SubmitButton variant="secondary" loading={actionLoading === 'rejectScore'}>Reject</SubmitButton>
			</form>
			<form method="POST" action="/sessions/{session.id}/live?/respondScore" use:enhance={handleAction('acceptScore')}>
				<input type="hidden" name="match_id" value={match.id} />
				<input type="hidden" name="accept" value="true" />
				<SubmitButton loading={actionLoading === 'acceptScore'}>Accept</SubmitButton>
			</form>
		</div>
	</div>
</AppModal>
