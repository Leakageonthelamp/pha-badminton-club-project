<script lang="ts">
	import { enhance } from '$app/forms';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import { t } from '@repo/ui/i18n';
	import { splitTeams } from '@repo/ui/matches';
	import type { MatchWithDetails } from '$lib/types/match';
	import type { SubmitFunction } from '@sveltejs/kit';

	const INVITE_WINDOW_MS = 90_000;

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
	const inviteWindowOpen = $derived(
		Boolean(match?.invite_expires_at) && match?.status === 'pending'
	);
	const showInviteCountdown = $derived(inviteWindowOpen);

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

	const roundLabel = $derived(
		match?.round_type === 'two_round' ? t('matches.invite.twoGames') : t('matches.invite.oneGame')
	);

	const playerName = (player: MatchWithDetails['players'][number]) =>
		player.profile?.display_name ?? t('common.player');

	const inviteStatusLabel = (status: MatchWithDetails['players'][number]['invite_status']) => {
		switch (status) {
			case 'accepted':
				return t('matches.invite.statusAccepted');
			case 'rejected':
				return t('matches.invite.statusDeclined');
			default:
				return t('matches.invite.statusWaiting');
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

	const waitingForMoreLabel = $derived.by(() => {
		const count = 4 - acceptedCount;
		return count === 1
			? t('matches.invite.waitingForMore', { count })
			: t('matches.invite.waitingForMorePlural', { count });
	});
</script>

{#snippet playerRow(player: MatchWithDetails['players'][number], you = false)}
	<li class="flex items-center gap-2.5">
		<UserAvatar
			displayName={playerName(player)}
			avatarUrl={player.profile?.avatar_url ?? null}
			size="sm"
		/>
		<div class="min-w-0 flex-1">
			<p class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
				{playerName(player)}
				{#if you}
					<span class="text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('common.youParen')}</span>
				{/if}
			</p>
			{#if player.profile?.tag}
				<TagPill tag={player.profile.tag} class="mt-0.5" />
			{/if}
		</div>
		<span
			class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold {inviteStatusClass(
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
		<div class="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-xl ring-1 ring-black/5">
			<div class="border-b border-brand-700/40 bg-brand-600 px-4 py-3 text-white sm:px-5">
				<p class="text-[0.65rem] font-semibold uppercase tracking-wide text-white/75">
					{waitingForOthers ? t('matches.invite.waitingForPlayers') : t('matches.invite.youreInvited')}
				</p>
				<h2 id="match-found-title" class="mt-0.5 text-base font-bold tracking-tight">
					{t('matches.invite.matchOnCourt', { number: match.court_number })}
				</h2>
				<p class="mt-0.5 text-xs text-white/80">
					{t('matches.invite.playTo', { scoreType: match.score_type, roundLabel })}
				</p>

				<div
					class="mt-3 grid gap-2 {showInviteCountdown ? 'grid-cols-2' : 'grid-cols-1'}"
					aria-live="polite"
				>
					<div class="rounded-lg bg-white/15 px-2.5 py-2 text-center ring-1 ring-white/20">
						<p class="text-[0.65rem] font-semibold uppercase tracking-wide text-white/75">
							{t('matches.invite.accepted')}
						</p>
						<p class="mt-0.5 font-mono text-xl font-bold tabular-nums leading-none">
							{acceptedCount}/4
						</p>
					</div>

					{#if showInviteCountdown}
						<div class="rounded-lg bg-white/15 px-2.5 py-2 ring-1 ring-white/20">
							<p
								class="text-center text-[0.65rem] font-semibold uppercase tracking-wide text-white/75"
							>
								{t('matches.invite.timeLeft')}
							</p>
							<p class="mt-0.5 text-center font-mono text-xl font-bold tabular-nums leading-none">
								{countdownSeconds}s
							</p>
							<div class="mt-1.5 h-1 overflow-hidden rounded-full bg-white/25">
								<div
									class="h-full rounded-full bg-white dark:bg-slate-900 transition-[width] duration-300 ease-linear"
									style:width="{countdownProgress * 100}%"
								></div>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<div class="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
				{#if waitingForOthers}
					<div
						class="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-center dark:border-brand-800 dark:bg-brand-900/30"
						aria-live="polite"
					>
						<p class="text-sm font-medium text-brand-900 dark:text-brand-200">
							{waitingForMoreLabel}
						</p>
						{#if inviteWindowOpen}
							<p class="mt-1 text-sm text-brand-800 dark:text-brand-300">
								{t('matches.invite.allMustAccept', { seconds: countdownSeconds })}
							</p>
						{/if}
					</div>
				{:else if awaitingResponse}
					<p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400 dark:text-slate-500">
						{#if inviteWindowOpen}
							{t('matches.invite.acceptPrompt', {
								court: match.court_number,
								seconds: countdownSeconds
							})}
						{:else}
							{t('matches.invite.acceptPromptNoTimer', { court: match.court_number })}
						{/if}
					</p>
				{/if}

				<div class="grid gap-3 sm:grid-cols-2">
					<div class="rounded-xl border border-brand-200 bg-brand-50/60 p-3 dark:border-brand-800 dark:bg-brand-900/30">
						<p class="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">{t('matches.invite.yourTeam')}</p>
						<ul class="mt-2 space-y-2">
							{#each teammates as player (player.id)}
								{@render playerRow(player, player.user_id === userId)}
							{/each}
						</ul>
					</div>

					<div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 p-3 dark:bg-slate-800/50">
						<p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('matches.invite.opponents')}</p>
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
								{t('matches.invite.decline')}
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
								{t('matches.invite.acceptMatch')}
							</SubmitButton>
						</form>
					</div>
				{/if}
			</div>
		</div>
	</AppModal>
{/if}
