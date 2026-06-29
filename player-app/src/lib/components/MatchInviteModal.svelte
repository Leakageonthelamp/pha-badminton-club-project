<script lang="ts">
	import { enhance } from '$app/forms';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import LayersIcon from '@repo/ui/icons/LayersIcon.svelte';
	import { splitTeams } from '@repo/ui/matches';
	import type { MatchWithDetails } from '$lib/types/match';
	import type { SubmitFunction } from '@sveltejs/kit';

	const INVITE_WINDOW_MS = 30_000;
	const RING_RADIUS = 15;
	const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

	let {
		open = false,
		match = null,
		userId,
		nowMs,
		actionLoading = null,
		handleAction
	}: {
		open?: boolean;
		match: MatchWithDetails | null;
		userId: string;
		nowMs: number;
		actionLoading?: string | null;
		handleAction: (key: string) => SubmitFunction;
	} = $props();

	const me = $derived(match?.players.find((player) => player.user_id === userId) ?? null);
	const teams = $derived(match ? splitTeams(match.players) : { teamA: [], teamB: [] });
	const myTeam = $derived(me?.team ?? null);
	const opponents = $derived(
		myTeam === 'A' ? teams.teamB : myTeam === 'B' ? teams.teamA : []
	);
	const teammates = $derived(
		myTeam === 'A' ? teams.teamA : myTeam === 'B' ? teams.teamB : []
	);
	const awaitingResponse = $derived(me?.invite_status === 'pending');
	const acceptedCount = $derived(
		match?.players.filter((player) => player.invite_status === 'accepted').length ?? 0
	);
	const waitingForOthers = $derived(!awaitingResponse && match?.status === 'pending');

	const countdownMs = $derived.by(() => {
		const expiresAt = match?.invite_expires_at;
		if (!expiresAt) return 0;
		return Math.max(0, new Date(expiresAt).getTime() - nowMs);
	});

	const countdownSeconds = $derived(Math.ceil(countdownMs / 1000));

	const countdownTotalMs = $derived.by(() => {
		if (!match?.invite_expires_at) return INVITE_WINDOW_MS;
		if (!match.created_at) return INVITE_WINDOW_MS;

		const total =
			new Date(match.invite_expires_at).getTime() - new Date(match.created_at).getTime();
		return total > 0 ? total : INVITE_WINDOW_MS;
	});

	const countdownProgress = $derived(
		countdownTotalMs > 0 ? Math.max(0, Math.min(1, countdownMs / countdownTotalMs)) : 0
	);

	const ringOffset = $derived(RING_CIRCUMFERENCE * (1 - countdownProgress));

	const roundLabel = $derived(
		match?.round_type === 'two_round' ? '2 games' : '1 game'
	);

	const playerName = (player: MatchWithDetails['players'][number]) =>
		player.profile?.display_name ?? 'Player';

	const inviteStatusLabel = (status: MatchWithDetails['players'][number]['invite_status']) => {
		switch (status) {
			case 'accepted':
				return 'Accepted';
			case 'rejected':
				return 'Declined';
			default:
				return 'Waiting';
		}
	};

	const inviteStatusClass = (status: MatchWithDetails['players'][number]['invite_status']) => {
		switch (status) {
			case 'accepted':
				return 'bg-emerald-100 text-emerald-800';
			case 'rejected':
				return 'bg-rose-100 text-rose-800';
			default:
				return 'bg-amber-100 text-amber-800';
		}
	};
</script>

{#snippet playerRow(player: MatchWithDetails['players'][number], you = false)}
	<li class="flex items-center gap-2.5">
		<UserAvatar
			displayName={playerName(player)}
			avatarUrl={player.profile?.avatar_url ?? null}
			size="sm"
		/>
		<div class="min-w-0 flex-1">
			<p class="truncate text-sm font-medium text-slate-900">
				{playerName(player)}
				{#if you}
					<span class="text-slate-500">(you)</span>
				{/if}
			</p>
			{#if player.profile?.tag}
				<TagPill tag={player.profile.tag} class="mt-0.5" />
			{/if}
		</div>
		<span
			class="shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold {inviteStatusClass(
				player.invite_status
			)}"
		>
			{inviteStatusLabel(player.invite_status)}
		</span>
	</li>
{/snippet}

{#if match}
	<AppModal
		{open}
		labelledBy="match-found-title"
		closeOnBackdrop={false}
		closeOnEscape={false}
	>
		<div class="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
			<div
				class="relative overflow-hidden border-b border-brand-100 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 px-5 py-5 text-white"
			>
				<div
					class="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10"
					aria-hidden="true"
				></div>
				<div
					class="pointer-events-none absolute -bottom-10 left-1/3 h-24 w-24 rounded-full bg-white/5"
					aria-hidden="true"
				></div>

				<div class="relative flex items-start gap-4">
					<div
						class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20"
						aria-hidden="true"
					>
						<LayersIcon class="h-6 w-6 text-white" />
					</div>

					<div class="min-w-0 flex-1">
						<p class="text-xs font-semibold uppercase tracking-wide text-brand-100">
							{waitingForOthers ? 'Waiting for players' : "You're invited"}
						</p>
						<h2 id="match-found-title" class="mt-1 text-xl font-bold tracking-tight">
							Match on Court {match.court_number}
						</h2>
						<p class="mt-1 text-sm text-brand-100">
							Play to {match.score_type} · {roundLabel}
						</p>
					</div>

					{#if awaitingResponse}
						<div
							class="relative flex h-16 w-16 shrink-0 items-center justify-center"
							aria-live="polite"
						>
							<svg class="h-16 w-16 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
								<circle
									cx="18"
									cy="18"
									r={RING_RADIUS}
									fill="none"
									class="stroke-white/25"
									stroke-width="3"
								/>
								<circle
									cx="18"
									cy="18"
									r={RING_RADIUS}
									fill="none"
									class="stroke-white transition-[stroke-dashoffset] duration-300 ease-linear"
									stroke-width="3"
									stroke-linecap="round"
									stroke-dasharray={RING_CIRCUMFERENCE}
									stroke-dashoffset={ringOffset}
								/>
							</svg>
							<span class="absolute font-mono text-lg font-bold tabular-nums">
								{countdownSeconds}s
							</span>
						</div>
					{:else}
						<div class="shrink-0 rounded-2xl bg-white/15 px-3 py-2 text-center ring-1 ring-white/20">
							<p class="font-mono text-2xl font-bold tabular-nums leading-none">
								{acceptedCount}/4
							</p>
							<p class="mt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-brand-100">
								Accepted
							</p>
						</div>
					{/if}
				</div>
			</div>

			<div class="space-y-4 px-5 py-5">
				{#if waitingForOthers}
					<div
						class="rounded-xl border border-brand-200 bg-brand-50/70 px-4 py-3 text-center"
						aria-live="polite"
					>
						<p class="text-sm font-medium text-brand-900">
							You accepted — waiting for {4 - acceptedCount} more player{4 - acceptedCount === 1
								? ''
								: 's'}.
						</p>
						<p class="mt-1 text-xs text-brand-800">
							When all four accept, you'll go to match live automatically.
						</p>
					</div>
				{:else}
					<p class="text-sm leading-relaxed text-slate-600">
						Accept to head to the court. Decline only if you can't play — the offer expires when the
						timer runs out.
					</p>
				{/if}

				<div class="grid gap-3 sm:grid-cols-2">
					<div class="rounded-xl border border-brand-200 bg-brand-50/60 p-3">
						<p class="text-xs font-semibold uppercase tracking-wide text-brand-700">Your team</p>
						<ul class="mt-2 space-y-2">
							{#each teammates as player (player.id)}
								{@render playerRow(player, player.user_id === userId)}
							{/each}
						</ul>
					</div>

					<div class="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
						<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Opponents</p>
						<ul class="mt-2 space-y-2">
							{#each opponents as player (player.id)}
								{@render playerRow(player)}
							{/each}
						</ul>
					</div>
				</div>

				{#if awaitingResponse}
					<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<form
							method="POST"
							action="?/respondInvite"
							class="sm:flex-1 sm:flex sm:justify-end"
							use:enhance={handleAction('rejectInvite')}
						>
							<input type="hidden" name="match_id" value={match.id} />
							<input type="hidden" name="accept" value="false" />
							<SubmitButton
								variant="secondary"
								loading={actionLoading === 'rejectInvite'}
								class="w-full sm:!w-auto"
							>
								Decline
							</SubmitButton>
						</form>
						<form
							method="POST"
							action="?/respondInvite"
							class="sm:flex-1"
							use:enhance={handleAction('acceptInvite')}
						>
							<input type="hidden" name="match_id" value={match.id} />
							<input type="hidden" name="accept" value="true" />
							<SubmitButton loading={actionLoading === 'acceptInvite'} class="w-full">
								Accept match
							</SubmitButton>
						</form>
					</div>
				{:else}
					<p class="text-center text-xs text-slate-500">
						Invite expires in {countdownSeconds}s if not all players accept.
					</p>
				{/if}
			</div>
		</div>
	</AppModal>
{/if}
