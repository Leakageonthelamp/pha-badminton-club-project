<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import AppCard from '@repo/ui/components/AppCard.svelte';
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
	import { subscribePostgresChangesWithPollFallback } from '@repo/ui/realtimeSubscribe';
	import { createSupabaseBrowserClient } from '$lib/supabase/client';
	import type { MatchGameInput } from '$lib/types/match';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let nowMs = $state(Date.now());
	let actionLoading = $state<string | null>(null);
	let gameScores = $state<Array<{ team_a_score: string; team_b_score: string }>>([]);

	const session = $derived(data.session);
	const match = $derived(data.match);
	const teams = $derived(splitTeams(match.players));
	const gameCount = $derived(match.round_type === 'two_round' ? 2 : 1);
	const uptimeLabel = $derived(
		match.started_at ? formatUptime(match.started_at, nowMs) : '—'
	);
	const winner = $derived(deriveMatchWinner(match.games));

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
		(key: string): SubmitFunction =>
		() => {
			actionLoading = key;
			return async ({ result, update }) => {
				await update({ reset: false });
				actionLoading = null;
				if (result.type === 'redirect') {
					goto(result.location);
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
	<DashboardHero
		eyebrow="Match control"
		title={`Court ${match.court_number}`}
		subtitle={session.name}
	>
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
			<h2 class="text-sm font-semibold text-slate-800">Current score</h2>
			<p class="text-lg font-medium text-slate-900">{formatMatchScore(match.games)}</p>
			{#if winner}
				<p class="text-sm text-slate-600">Winner: Team {winner}</p>
			{/if}
		</AppCard>
	{/if}

	{#if match.status === 'active'}
		<AppCard class="space-y-4">
			<h2 class="text-sm font-semibold text-slate-800">Match actions</h2>

			<form method="POST" action="?/addShuttle" use:enhance={handleAction('addShuttle')}>
				<SubmitButton variant="secondary" loading={actionLoading === 'addShuttle'}>
					Add shuttle
				</SubmitButton>
			</form>

			<form method="POST" action="?/endWithScore" use:enhance={handleAction('endWithScore')} class="space-y-3">
				<p class="text-sm text-slate-600">End match and log score (points to {match.score_type}).</p>
				{#each gameScores as game, index (index)}
					<div class="grid grid-cols-2 gap-3">
						<label class="space-y-1">
							<span class="text-xs font-medium text-slate-600">Game {index + 1} — Team A</span>
							<input
								class="app-input"
								type="number"
								min="0"
								bind:value={game.team_a_score}
								required
							/>
						</label>
						<label class="space-y-1">
							<span class="text-xs font-medium text-slate-600">Game {index + 1} — Team B</span>
							<input
								class="app-input"
								type="number"
								min="0"
								bind:value={game.team_b_score}
								required
							/>
						</label>
					</div>
				{/each}
				<input type="hidden" name="games_json" value={gamesJson} />
				<SubmitButton loading={actionLoading === 'endWithScore'}>End with score</SubmitButton>
			</form>

			<form method="POST" action="?/endNoScore" use:enhance={handleAction('endNoScore')}>
				<SubmitButton variant="secondary" loading={actionLoading === 'endNoScore'}>
					End without score
				</SubmitButton>
			</form>
		</AppCard>
	{:else if match.status === 'suspended'}
		<AppCard class="space-y-4">
			<p class="text-sm text-amber-800">
				A player rejected the submitted score. Enter the final score to complete the match.
			</p>
			<form method="POST" action="?/resolveScore" use:enhance={handleAction('resolveScore')} class="space-y-3">
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
				<SubmitButton loading={actionLoading === 'resolveScore'}>Resolve score</SubmitButton>
			</form>
		</AppCard>
	{:else if match.status === 'score_pending'}
		<AppCard>
			<p class="text-sm text-slate-600">Waiting for players to confirm the submitted score.</p>
		</AppCard>
	{/if}

	<SubmitButton type="button" variant="secondary" onclick={() => goto(`/sessions/${session.id}/control`)}>
		Back to session control
	</SubmitButton>
</section>
