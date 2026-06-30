<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import CourtGrid from '@repo/ui/components/CourtGrid.svelte';
	import CourtDetailModal from '@repo/ui/components/CourtDetailModal.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import FormToast from '@repo/ui/components/FormToast.svelte';
	import PlayerStatusBadge from '@repo/ui/components/PlayerStatusBadge.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import SessionLiveTimers from '@repo/ui/components/SessionLiveTimers.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import BuildingIcon from '@repo/ui/icons/BuildingIcon.svelte';
	import HomeIcon from '@repo/ui/icons/HomeIcon.svelte';
	import LayersIcon from '@repo/ui/icons/LayersIcon.svelte';
	import { formatDateTime, formatUptime } from '@repo/ui/datetime';
	import MatchSummarySheet from '$lib/components/MatchSummarySheet.svelte';
	import PlayerMatchHistoryCard from '@repo/ui/components/PlayerMatchHistoryCard.svelte';
	import { playerMatchResult } from '@repo/ui/matches';
	import { formatThb, paymentStatusLabel, computePlayerShuttleShare, deriveShuttlesFromShare, courtFeePerPlayerModeHint, courtFeePerPlayerModeLabel } from '@repo/ui/payments';
	import { subscribePostgresChangesWithPollFallback } from '@repo/ui/realtimeSubscribe';
	import { clampIdleSince, derivePlayerLiveStatus } from '@repo/ui/sessionStatus';
	import PaymentQr from '$lib/components/PaymentQr.svelte';
	import SlipUploadField from '$lib/components/SlipUploadField.svelte';
	import MatchInviteModal from '$lib/components/MatchInviteModal.svelte';
	import MatchScoreConfirmModal from '$lib/components/MatchScoreConfirmModal.svelte';
	import type { CourtGridMatch, MatchWithDetails } from '$lib/types/match';
	import {
		canRequestEarlyLeave,
		deriveLiveSessionUiState,
		isLiveSessionEnded,
		shouldShowPaymentModal
	} from '$lib/sessions/liveState';
	import {
		hasCourtMatch,
		isInUnresolvedMatch,
		isMatchLiveDismissed,
		matchLiveHref,
		shouldOpenMatchLive,
		shouldAutoOpenMatchLive
	} from '$lib/sessions/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase/client';
	import { sessionStatusBadgeClass, sessionStatusLabel } from '$lib/types/session';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { onMount } from 'svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let nowMs = $state(Date.now());
	let actionLoading = $state<string | null>(null);
	let paymentSlipFile = $state<File | null>(null);
	let matchNavLoading = $state(false);
	let autoNavigatedMatchId = $state<string | null>(null);
	let selectedHistoryMatch = $state<MatchWithDetails | null>(null);
	let courtDetailOpen = $state(false);
	let selectedCourtMatch = $state<CourtGridMatch | null>(null);
	let leaveConfirmOpen = $state(false);
	let homeNavLoading = $state(false);

	const session = $derived(data.session);
	const sessionEnded = $derived(
		isLiveSessionEnded({
			status: session.status,
			endAtMs: Date.parse(session.end_at),
			nowMs,
			settlementStarted: data.settlementStarted
		})
	);
	const uiState = $derived(
		deriveLiveSessionUiState({
			membershipStatus: session.my_membership?.status ?? null,
			leaveRequestStatus: data.myLeaveRequest?.status ?? null,
			paymentStatus: data.myPayment?.status ?? null,
			sessionClosed: session.status === 'closed'
		})
	);
	const myShuttlesUsed = $derived(
		data.myMatchHistory.reduce((sum, match) => sum + match.shuttles_used, 0)
	);
	const isBilled = $derived(Boolean(data.myPayment));
	const myShuttlesUsedDisplay = $derived.by(() => {
		if (myShuttlesUsed > 0) return myShuttlesUsed;

		const billedShare = data.myPayment?.shuttle_share ?? 0;
		if (isBilled && billedShare > 0) {
			return deriveShuttlesFromShare(billedShare, session.shuttle_price_per_each);
		}

		return 0;
	});
	const sessionShuttlesUsed = $derived(
		data.sessionMatches.reduce((sum, match) => sum + match.shuttles_used, 0)
	);
	const completedSessionMatchCount = $derived(
		data.sessionMatches.filter((match) => match.status === 'completed').length
	);
	const myCourtShare = $derived(data.myPayment?.court_share ?? data.perPlayerCost);
	const courtFeePerPlayerHint = $derived(
		courtFeePerPlayerModeHint(session.fixed_court_fee_per_player, data.activePlayerCount)
	);
	const myShuttleShare = $derived(
		data.myPayment?.shuttle_share ??
			computePlayerShuttleShare(myShuttlesUsed, session.shuttle_price_per_each)
	);
	const myTotalCost = $derived(data.myPayment?.total_amount ?? myCourtShare + myShuttleShare);
	const promptPayTarget = $derived(data.clubPromptPay.promptpay_target ?? '');
	const toastMessage = $derived(form?.message ?? null);
	const toastVariant = $derived(form?.success ? 'success' : 'error');
	const myLiveStatus = $derived(
		derivePlayerLiveStatus({
			membershipStatus: session.my_membership?.status ?? 'confirmed',
			activity: session.my_membership?.activity ?? 'idle'
		})
	);
	const myIdleLabel = $derived.by(() => {
		const idleSince = clampIdleSince(session.my_membership?.idle_since ?? null, session.start_at);
		if (!idleSince) return null;

		return formatUptime(idleSince, nowMs);
	});
	const showPaymentModal = $derived(
		shouldShowPaymentModal(
			uiState,
			data.myPayment?.status ?? null,
			session.status === 'closed' || session.my_membership?.status === 'left'
		)
	);

	const sessionDurationLabel = $derived.by(() => {
		const start = new Date(session.start_at);
		const end = new Date(session.end_at);
		const ms = end.getTime() - start.getTime();
		if (ms <= 0) return '—';

		const totalMinutes = Math.round(ms / 60_000);
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;

		if (minutes === 0) return `${hours} hr`;
		if (hours === 0) return `${minutes} min`;
		return `${hours} hr ${minutes} min`;
	});

	const shuttlePriceLabel = $derived(formatThb(session.shuttle_price_per_each));

	const shuttleDetailLabel = $derived.by(() => {
		if (!session.shuttle) return shuttlePriceLabel;

		const parts = [session.shuttle.name, `Speed ${session.shuttle.speed}`, shuttlePriceLabel];
		if (session.shuttle.number_per_box > 0) {
			parts.push(`${session.shuttle.number_per_box} per box`);
		}
		return parts.join(' · ');
	});

	const summaryPaymentStatus = $derived(data.myPayment?.status ?? null);
	const summaryPaymentBadgeClass = $derived.by(() => {
		switch (summaryPaymentStatus) {
			case 'approved':
				return 'bg-emerald-100 text-emerald-800 ring-emerald-200';
			case 'submitted':
				return 'bg-sky-100 text-sky-800 ring-sky-200';
			case 'pending':
				return 'bg-amber-100 text-amber-900 ring-amber-200';
			default:
				return 'bg-slate-100 text-slate-700 ring-slate-200';
		}
	});
	const summaryHeadline = $derived(
		session.my_membership?.status === 'left' && data.myLeaveRequest?.status === 'approved'
			? 'You left early — all settled'
			: 'Session complete'
	);
	const inviteExpiredLocally = $derived.by(() => {
		const invite = data.myInviteMatch;
		if (!invite?.invite_expires_at) return false;
		return new Date(invite.invite_expires_at).getTime() <= nowMs;
	});
	const showInviteModal = $derived(Boolean(data.myInviteMatch) && !inviteExpiredLocally);
	const hasOpenCourtMatch = $derived(hasCourtMatch(data.myOpenMatch));
	const breakBlocked = $derived(
		myLiveStatus === 'playing' || hasOpenCourtMatch || showInviteModal
	);
	const matchLocked = $derived(
		myLiveStatus === 'playing' || isInUnresolvedMatch(data.myOpenMatch)
	);
	const sessionActionsBusy = $derived(actionLoading !== null || matchNavLoading);
	const summaryActionsBusy = $derived(homeNavLoading);
	const myScorePendingMatch = $derived(
		data.myOpenMatch?.status === 'score_pending' ? data.myOpenMatch : null
	);
	const sortedMyMatchHistory = $derived(
		[...data.myMatchHistory].sort((a, b) => {
			const aMs = new Date(a.ended_at ?? a.created_at).getTime();
			const bMs = new Date(b.ended_at ?? b.created_at).getTime();
			return bMs - aMs;
		})
	);
	const myMatchRecord = $derived.by(() => {
		let wins = 0;
		let losses = 0;

		for (const match of data.myMatchHistory) {
			const result = playerMatchResult(data.userId, match.players, match.games);
			if (result === 'win') wins += 1;
			else if (result === 'lose') losses += 1;
		}

		return { wins, losses, played: data.myMatchHistory.length };
	});
	const showScoreConfirmModal = $derived.by(() => {
		if (!myScorePendingMatch) return false;
		const me = myScorePendingMatch.players.find((player) => player.user_id === data.userId);
		return Boolean(
			me &&
				me.user_id !== myScorePendingMatch.score_submitted_by &&
				me.score_response === 'pending'
		);
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

		const invite = data.myInviteMatch;
		if (!invite?.invite_expires_at) return;

		const expiresAt = new Date(invite.invite_expires_at).getTime();
		const invalidateLive = () => void invalidate('app:live-session');

		if (expiresAt <= Date.now()) {
			invalidateLive();
			return;
		}

		const timer = window.setTimeout(invalidateLive, expiresAt - Date.now());
		return () => window.clearTimeout(timer);
	});

	$effect(() => {
		if (!browser || !shouldAutoOpenMatchLive(data.myOpenMatch)) return;

		const matchId = data.myOpenMatch!.id;
		if (isMatchLiveDismissed(session.id, matchId)) return;
		if (autoNavigatedMatchId === matchId) return;

		autoNavigatedMatchId = matchId;
		void goto(matchLiveHref(session.id, matchId));
	});

	onMount(() => {
		const supabase = createSupabaseBrowserClient();
		const sessionId = session.id;

		return subscribePostgresChangesWithPollFallback(
			supabase,
			`player-live-session-${sessionId}`,
			[
				{ table: 'session_players', filter: `session_id=eq.${sessionId}` },
				{ table: 'payments', filter: `session_id=eq.${sessionId}` },
				{ table: 'session_leave_requests', filter: `session_id=eq.${sessionId}` },
				{ event: 'UPDATE', table: 'sessions', filter: `id=eq.${sessionId}` },
				{ table: 'matches', filter: `session_id=eq.${sessionId}` },
				{ table: 'match_players', filter: `session_id=eq.${sessionId}` }
			],
			() => void invalidate('app:live-session')
		);
	});

	const handleSubmitPayment: SubmitFunction = ({ formData, cancel }) => {
		if (!paymentSlipFile) {
			cancel();
			return;
		}

		formData.set('slip', paymentSlipFile);
		actionLoading = 'submitPayment';
		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') {
				paymentSlipFile = null;
			}
			actionLoading = null;
		};
	};

	const handleAction =
		(key: string): SubmitFunction =>
		() => {
			actionLoading = key;
			return async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'redirect') {
					await goto(result.location);
				}
				actionLoading = null;
			};
		};

	const handleLeaveRequest: SubmitFunction = () => {
		actionLoading = 'requestLeave';
		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') {
				leaveConfirmOpen = false;
			}
			actionLoading = null;
		};
	};

	const closeLeaveConfirm = () => {
		if (actionLoading === 'requestLeave') return;
		leaveConfirmOpen = false;
	};

	const openSummaryMatch = (match: MatchWithDetails) => {
		if (summaryActionsBusy) return;
		selectedHistoryMatch = match;
	};

	const goHomeFromSummary = () => {
		if (summaryActionsBusy) return;
		homeNavLoading = true;
		void goto('/').finally(() => {
			homeNavLoading = false;
		});
	};

	const openMatchLive = () => {
		if (!data.myOpenMatch || sessionActionsBusy) return;
		matchNavLoading = true;
		void goto(matchLiveHref(session.id, data.myOpenMatch.id)).finally(() => {
			matchNavLoading = false;
		});
	};

	const handleCourtClick = (courtNumber: number) => {
		const match = data.courtGridMatches.find((entry) => entry.courtNumber === courtNumber);
		if (!match?.matchId) return;

		selectedCourtMatch = match;
		courtDetailOpen = true;
	};

	const openSelectedCourtMatch = () => {
		if (!selectedCourtMatch?.matchId || sessionActionsBusy) return;

		courtDetailOpen = false;
		matchNavLoading = true;
		void goto(matchLiveHref(session.id, selectedCourtMatch.matchId)).finally(() => {
			matchNavLoading = false;
		});
	};

	const showSelectedCourtMatchAction = $derived(
		Boolean(
			selectedCourtMatch?.matchId &&
				data.myOpenMatch?.id === selectedCourtMatch.matchId &&
				shouldOpenMatchLive(data.myOpenMatch)
		)
	);
</script>

{#snippet playerCostPanel(hero: boolean, footnote: boolean, paymentStatus: typeof summaryPaymentStatus)}
	<div class="app-cost-panel">
		{#if hero}
			<div class="app-cost-hero">
				<p class="app-cost-hero-label">Your cost</p>
				<div class="app-cost-hero-row">
					<p class="app-cost-hero-amount">{formatThb(myTotalCost)}</p>
					<div class="app-cost-hero-meta">
						{#if paymentStatus}
							<span
								class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 {summaryPaymentBadgeClass}"
							>
								{paymentStatusLabel(paymentStatus)}
							</span>
						{:else if !isBilled}
							<span class="app-cost-hero-estimate">Estimate</span>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<div class="app-cost-lines">
			<div class="app-cost-line">
				<div class="min-w-0">
					<p class="app-cost-line-label">
						Court fee per player · {courtFeePerPlayerModeLabel(session.fixed_court_fee_per_player)}
					</p>
					<p class="app-cost-line-hint">{courtFeePerPlayerHint}</p>
				</div>
				<p class="app-cost-line-amount">{formatThb(myCourtShare)}</p>
			</div>
			<div class="app-cost-line">
				<div class="min-w-0">
					<p class="app-cost-line-label">Shuttle fee</p>
					<p class="app-cost-line-hint">
						{#if myShuttlesUsedDisplay === 0}
							No shuttles from your matches yet
						{:else if myShuttlesUsedDisplay === sessionShuttlesUsed}
							{myShuttlesUsedDisplay} shuttle{myShuttlesUsedDisplay === 1 ? '' : 's'} from your matches
						{:else}
							{myShuttlesUsedDisplay} in your matches · {sessionShuttlesUsed} session-wide
						{/if}
					</p>
				</div>
				<p class="app-cost-line-amount">{formatThb(myShuttleShare)}</p>
			</div>
		</div>

		{#if footnote && !isBilled}
			<p class="app-cost-footnote">Shuttle fee may increase if you play more matches.</p>
		{/if}
	</div>
{/snippet}

<section class="space-y-6">
	<DashboardHero
		eyebrow={uiState === 'summary' ? 'Wrap-up' : 'Live session'}
		title={session.name}
		subtitle={session.club?.name ?? 'Session'}
	>
		<div class="flex flex-wrap items-center gap-2">
			<span class="rounded-full px-2 py-0.5 text-xs font-medium {sessionStatusBadgeClass(session.status)}">
				{sessionStatusLabel(session.status)}
			</span>
			{#if sessionEnded}
				<span class="app-hero-stat app-hero-stat--warn">Session ended</span>
			{/if}
			{#if uiState === 'summary'}
				<span class="app-hero-stat app-hero-stat--success">Done</span>
			{/if}
		</div>
	</DashboardHero>

	{#if session.status === 'in_progress'}
		<SessionLiveTimers
			startAt={session.start_at}
			endAt={session.end_at}
			showRemaining={!sessionEnded}
			showOverdue={sessionEnded}
			variant="banner"
		/>

		{#if sessionEnded}
			<div class="rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-900">
				<strong>Session ended.</strong> Wait for the host to start settlement. You cannot take a break
				or request to leave until then.
			</div>
		{/if}

		{#if breakBlocked}
			<div class="app-session-countdown flex flex-col gap-3 border-brand-200 bg-brand-50/80">
				<div class="flex items-center justify-between gap-3">
					<span class="app-session-countdown-label text-brand-800">Your status</span>
					<PlayerStatusBadge
						status={myLiveStatus === 'playing' || hasOpenCourtMatch ? 'playing' : myLiveStatus}
					/>
				</div>
				{#if showInviteModal}
					<p class="text-sm leading-relaxed text-brand-900">
						Respond to the match invite — session leave, break, and other actions are unavailable
						until the invite is resolved.
					</p>
				{:else}
					<p class="text-sm leading-relaxed text-brand-900">
						You are in a match. Leave, break, and other session actions are unavailable until the
						match ends.
					</p>
				{/if}
				{#if data.myOpenMatch && shouldOpenMatchLive(data.myOpenMatch)}
					<SubmitButton
						type="button"
						loading={matchNavLoading}
						loadingLabel="Opening match…"
						disabled={sessionActionsBusy && !matchNavLoading}
						onclick={openMatchLive}
					>
						Open match live
					</SubmitButton>
				{/if}
			</div>
		{:else if myLiveStatus === 'idle' || myLiveStatus === 'break'}
			<div class="app-session-countdown flex flex-col gap-3 border-slate-200 bg-slate-50/80">
					<div class="flex items-center justify-between gap-3">
						<span class="app-session-countdown-label text-slate-700">Your status</span>
						<PlayerStatusBadge status={myLiveStatus} />
					</div>

					{#if myLiveStatus === 'idle' && myIdleLabel}
						<div>
							<p class="text-xs font-medium text-slate-500">Idle time</p>
							<p
								class="font-mono text-2xl font-semibold tabular-nums text-slate-900"
								aria-live="polite"
							>
								{myIdleLabel}
							</p>
						</div>
					{/if}

					{#if myLiveStatus === 'idle'}
						<p class="text-sm leading-relaxed text-slate-600">
							You are available for the admin to assign to a match.
						</p>
						<form method="POST" action="?/toggleBreak" use:enhance={handleAction('breakOn')}>
							<input type="hidden" name="on_break" value="true" />
							<SubmitButton
								variant="secondary"
								loading={actionLoading === 'breakOn'}
								disabled={sessionEnded || (sessionActionsBusy && actionLoading !== 'breakOn')}
							>
								Take a break
							</SubmitButton>
						</form>
					{:else}
						<p class="text-sm leading-relaxed text-slate-600">
							You are on break. The admin cannot assign you until you continue.
						</p>
						<form method="POST" action="?/toggleBreak" use:enhance={handleAction('breakOff')}>
							<input type="hidden" name="on_break" value="false" />
							<SubmitButton
								loading={actionLoading === 'breakOff'}
								disabled={sessionEnded || (sessionActionsBusy && actionLoading !== 'breakOff')}
							>
								Continue playing
							</SubmitButton>
						</form>
					{/if}
				</div>
		{/if}
	{/if}

	<FormToast message={toastMessage} variant={toastVariant} />

	{#if uiState === 'summary'}
		<section
			class="overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-brand-50 shadow-sm ring-1 ring-emerald-100/80"
		>
			<div class="relative px-4 pb-5 pt-8 text-center sm:px-6">
				<div
					class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 shadow-sm ring-4 ring-white"
					aria-hidden="true"
				>
					<svg
						class="h-8 w-8 text-emerald-600"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<h2 class="mt-4 text-xl font-bold tracking-tight text-slate-900">{summaryHeadline}</h2>
				<p class="mt-2 text-sm leading-relaxed text-slate-600">
					Thanks for playing{session.club?.name ? ` at ${session.club.name}` : ''}. Here is your
					session recap.
				</p>
			</div>

			<div
				class="grid gap-4 border-y border-emerald-100/80 bg-white/70 px-4 py-5 sm:grid-cols-[1fr_auto_1fr_auto_1fr]"
			>
				<div>
					<p class="text-xs font-semibold uppercase tracking-wide text-brand-600">Start</p>
					<p class="mt-1 text-sm font-semibold text-slate-900 sm:text-base">
						{formatDateTime(session.start_at)}
					</p>
				</div>
				<div class="hidden self-center sm:block" aria-hidden="true">
					<div class="h-10 w-px bg-emerald-200"></div>
				</div>
				<div
					class="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 shadow-sm ring-1 ring-emerald-100/80"
				>
					<p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Duration</p>
					<p class="mt-1 text-lg font-semibold text-emerald-900">{sessionDurationLabel}</p>
				</div>
				<div class="hidden self-center sm:block" aria-hidden="true">
					<div class="h-10 w-px bg-emerald-200"></div>
				</div>
				<div class="sm:text-right">
					<p class="text-xs font-semibold uppercase tracking-wide text-brand-600">End</p>
					<p class="mt-1 text-sm font-semibold text-slate-900 sm:text-base">
						{formatDateTime(session.end_at)}
					</p>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-3 p-4 sm:p-6">
				<div class="col-span-2 space-y-3">
					{@render playerCostPanel(true, true, summaryPaymentStatus)}
					<p class="app-history-stat-hint px-1">
						{#if summaryPaymentStatus === 'approved'}
							Payment confirmed — you are all set.
						{:else if summaryPaymentStatus === 'submitted'}
							Waiting for admin to confirm your transfer.
						{:else if summaryPaymentStatus === 'pending'}
							Complete your PromptPay transfer if you have not already.
						{:else}
							Your share for this session.
						{/if}
					</p>
				</div>

				<div class="app-history-stat">
					<p class="app-history-stat-label">Venue</p>
					<p class="app-history-stat-value text-base leading-snug">{session.venue_name ?? '—'}</p>
				</div>

				<div class="app-history-stat">
					<p class="app-history-stat-label">Courts</p>
					<p class="app-history-stat-value">{session.court_count}</p>
					<p class="app-history-stat-hint">
						{formatThb(session.court_fee_per_hour)}/hr
					</p>
				</div>

				<div class="app-history-stat">
					<p class="app-history-stat-label">Matches played</p>
					<p class="app-history-stat-value">{myMatchRecord.played}</p>
					<p class="app-history-stat-hint">
						{#if myMatchRecord.played === 0}
							No matches
						{:else}
							{myMatchRecord.wins}W · {myMatchRecord.losses}L
						{/if}
					</p>
				</div>

				<div class="app-history-stat">
					<p class="app-history-stat-label">Your shuttles</p>
					<p class="app-history-stat-value">{myShuttlesUsedDisplay}</p>
					<p class="app-history-stat-hint">From your matches</p>
				</div>
			</div>

			<div class="border-t border-emerald-100/80 bg-white/70 px-4 py-5 sm:px-6">
				<div class="flex items-center justify-between gap-2">
					<h3 class="text-sm font-semibold uppercase tracking-wide text-brand-600">Your matches</h3>
					{#if myMatchRecord.played > 0}
						<span
							class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"
						>
							{myMatchRecord.wins}W · {myMatchRecord.losses}L
						</span>
					{/if}
				</div>
				{#if sortedMyMatchHistory.length === 0}
					<p class="mt-3 text-sm text-slate-600">
						You did not play a recorded match this session.
					</p>
				{:else}
					<ul class="mt-3 space-y-2">
						{#each sortedMyMatchHistory as match, index (match.id)}
							<li>
								<PlayerMatchHistoryCard
									{match}
									userId={data.userId}
									matchNumber={sortedMyMatchHistory.length - index}
									disabled={summaryActionsBusy}
									onClick={() => openSummaryMatch(match)}
								/>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="border-t border-emerald-100/80 bg-white/50 px-4 py-4 sm:px-6">
				<SubmitButton
					type="button"
					loading={homeNavLoading}
					loadingLabel="Going home…"
					disabled={summaryActionsBusy && !homeNavLoading}
					onclick={goHomeFromSummary}
				>
					<span class="inline-flex items-center justify-center gap-2">
						<HomeIcon class="h-5 w-5" />
						Back to home
					</span>
				</SubmitButton>
			</div>
		</section>
	{:else}
		{@render playerCostPanel(true, true, data.myPayment?.status ?? null)}

		<section class="app-detail-section">
			<div
				class="grid gap-4 border-b border-brand-100 bg-gradient-to-br from-brand-50 via-white to-brand-50/50 px-4 py-5 sm:grid-cols-[1fr_auto_1fr_auto_1fr]"
			>
				<div>
					<p class="text-xs font-semibold uppercase tracking-wide text-brand-600">Start</p>
					<p class="mt-1 text-base font-semibold text-slate-900">
						{formatDateTime(session.start_at)}
					</p>
				</div>
				<div class="hidden self-center sm:block" aria-hidden="true">
					<div class="h-10 w-px bg-brand-200"></div>
				</div>
				<div
					class="rounded-2xl border border-brand-100 bg-white/80 px-4 py-3 shadow-sm ring-1 ring-brand-100/80"
				>
					<p class="text-xs font-semibold uppercase tracking-wide text-brand-600">Duration</p>
					<p class="mt-1 text-lg font-semibold text-brand-800">{sessionDurationLabel}</p>
				</div>
				<div class="hidden self-center sm:block" aria-hidden="true">
					<div class="h-10 w-px bg-brand-200"></div>
				</div>
				<div class="sm:text-right">
					<p class="text-xs font-semibold uppercase tracking-wide text-brand-600">End</p>
					<p class="mt-1 text-base font-semibold text-slate-900">
						{formatDateTime(session.end_at)}
					</p>
				</div>
			</div>

			<div class="app-detail-section-body space-y-5">
				<div class="app-detail-section-header">
					<span class="app-detail-section-icon" aria-hidden="true">
						<LayersIcon class="h-5 w-5" />
					</span>
					<div>
						<h2 class="text-lg font-semibold text-slate-900">Session details</h2>
						<p class="text-sm text-slate-500">Venue, courts, and shuttle for this session</p>
					</div>
				</div>

				<dl class="app-detail-contact-grid">
					<div class="app-detail-contact-item app-detail-contact-item--wide">
						<dt class="app-detail-contact-label">
							<span class="inline-flex items-center gap-1.5">
								<BuildingIcon class="h-4 w-4 text-brand-500" />
								Venue
							</span>
						</dt>
						<dd class="app-detail-contact-value text-base">{session.venue_name ?? '—'}</dd>
					</div>
				</dl>

				<dl class="app-detail-meta-grid">
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">Courts</dt>
						<dd class="app-detail-meta-value">
							<span class="text-lg font-semibold text-brand-700">{session.court_count}</span>
						</dd>
					</div>
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">Court fee / hr</dt>
						<dd class="app-detail-meta-value text-base text-brand-800">
							{formatThb(session.court_fee_per_hour)}
						</dd>
					</div>
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">Shuttle usage</dt>
						<dd class="app-detail-meta-value">
							<span class="text-lg font-semibold text-brand-700">{sessionShuttlesUsed}</span>
							<p class="mt-1 text-sm text-slate-600">
								{#if completedSessionMatchCount === 0}
									No completed matches yet
								{:else}
									{sessionShuttlesUsed === 1 ? 'Shuttle' : 'Shuttles'} from {completedSessionMatchCount}
									completed match{completedSessionMatchCount === 1 ? '' : 'es'}
								{/if}
							</p>
						</dd>
					</div>
					<div class="app-detail-meta-item sm:col-span-2">
						<dt class="app-detail-meta-label">Shuttle</dt>
						<dd class="app-detail-meta-value">
							{#if session.shuttle}
								<p class="text-base font-semibold text-slate-900">{session.shuttle.name}</p>
								<p class="mt-1 text-sm text-slate-600">
									Speed {session.shuttle.speed} · {shuttlePriceLabel} each
									{#if session.shuttle.number_per_box > 0}
										· {session.shuttle.number_per_box} per box
									{/if}
								</p>
								<p class="mt-2 text-xs text-slate-500">
									{#if myShuttlesUsed > 0}
										Your shuttle share is in your cost above ({myShuttlesUsed} shuttle{myShuttlesUsed === 1 ? '' : 's'} from your matches).
									{:else}
										Your shuttle share appears in your cost when you complete matches.
									{/if}
								</p>
							{:else}
								<p class="text-sm text-slate-600">{shuttleDetailLabel}</p>
							{/if}
						</dd>
					</div>
				</dl>
			</div>
		</section>

		<AppCard class="space-y-4">
			<SectionHeading title="Active players" />
			{#if data.activePlayers.length === 0}
				<EmptyState message="No active players right now." />
			{:else}
				<ul class="divide-y divide-slate-100">
					{#each data.activePlayers as player (player.id)}
						{@const liveStatus = derivePlayerLiveStatus({
							membershipStatus: player.status,
							activity: player.activity
						})}
						<li class="flex items-center gap-3 py-3">
							<UserAvatar
								displayName={player.profile?.display_name ?? 'Player'}
								avatarUrl={player.profile?.avatar_url ?? null}
								size="sm"
							/>
							<div class="min-w-0 flex-1">
								<p class="truncate font-medium text-slate-800">
									{player.profile?.display_name ?? 'Unknown player'}
									{#if player.is_me}
										<span class="text-slate-500">(you)</span>
									{/if}
								</p>
								{#if player.profile?.tag}
									<TagPill tag={player.profile.tag} />
								{/if}
							</div>
							<PlayerStatusBadge status={liveStatus} />
						</li>
					{/each}
				</ul>
			{/if}
		</AppCard>

		<AppCard class="space-y-4">
			<SectionHeading title="Your match history" />
			{#if sortedMyMatchHistory.length === 0}
				<EmptyState message="No matches recorded yet." />
			{:else}
				<ul class="space-y-2">
					{#each sortedMyMatchHistory as match, index (match.id)}
						<li>
							<PlayerMatchHistoryCard
								{match}
								userId={data.userId}
								matchNumber={sortedMyMatchHistory.length - index}
								onClick={() => (selectedHistoryMatch = match)}
							/>
						</li>
					{/each}
				</ul>
			{/if}
		</AppCard>

		<AppCard class="space-y-4">
			<SectionHeading title="Courts" />
			<CourtGrid
				courtCount={session.court_count}
				matches={data.courtGridMatches}
				onCourtClick={handleCourtClick}
			/>
		</AppCard>

		<AppCard class="space-y-4">
			<SectionHeading title="Early leave" />
			{#if matchLocked}
				<p class="text-sm text-slate-600">Finish your current match before requesting to leave.</p>
			{:else if uiState === 'leave_pending'}
				<p class="text-sm text-slate-600">
					Your leave request is waiting for admin review. Complete payment below while you wait.
				</p>
				<form method="POST" action="?/cancelLeave" use:enhance={handleAction('cancelLeave')}>
					<SubmitButton
						variant="secondary"
						loading={actionLoading === 'cancelLeave'}
						disabled={sessionActionsBusy && actionLoading !== 'cancelLeave'}
					>
						Cancel leave request
					</SubmitButton>
				</form>
			{:else if canRequestEarlyLeave(session.my_membership, data.myLeaveRequest?.status ?? null, sessionEnded)}
				<p class="text-sm text-slate-600">
					You can leave before the session ends. You will still owe your court and shuttle share.
				</p>
				<SubmitButton type="button" onclick={() => (leaveConfirmOpen = true)}>
					Request to leave
				</SubmitButton>
			{:else if sessionEnded}
				<p class="text-sm text-slate-600">
					Session ended — wait for the host to start settlement and bill everyone.
				</p>
			{:else if uiState === 'awaiting_leave'}
				<p class="text-sm text-slate-600">
					Payment confirmed. Waiting for admin to approve your leave request.
				</p>
			{:else if uiState === 'payment_submitted'}
				<p class="text-sm text-slate-600">Payment submitted. Waiting for admin confirmation.</p>
			{:else}
				<p class="text-sm text-slate-600">
					Stay in the session or request to leave when you are ready.
				</p>
			{/if}
		</AppCard>
	{/if}
</section>

<AppModal
	open={showPaymentModal}
	labelledBy="payment-modal-title"
	onClose={() => {}}
>
	<div class="app-card-padded space-y-4">
		<h2 id="payment-modal-title" class="text-lg font-semibold text-slate-900">Pay session fee</h2>
		<p class="text-sm text-slate-600">
			Transfer exactly {formatThb(myTotalCost)} using PromptPay, attach your bank slip, then tap “I've paid”.
		</p>

		{@render playerCostPanel(false, !isBilled, data.myPayment?.status ?? null)}

		{#if promptPayTarget}
			<PaymentQr target={promptPayTarget} amount={myTotalCost} />
		{:else}
			<EmptyState message="Club PromptPay is not configured. Contact the admin." />
		{/if}

		{#if uiState === 'payment_due'}
			<SlipUploadField bind:file={paymentSlipFile} disabled={actionLoading === 'submitPayment'} />
			<form
				method="POST"
				action="?/submitPayment"
				enctype="multipart/form-data"
				use:enhance={handleSubmitPayment}
			>
				<SubmitButton
					loading={actionLoading === 'submitPayment'}
					disabled={!paymentSlipFile}
				>
					I've paid
				</SubmitButton>
			</form>
		{:else}
			<p class="text-center text-sm text-slate-600">
				{paymentStatusLabel(data.myPayment?.status ?? 'submitted')}
			</p>
		{/if}
	</div>
</AppModal>

<AppModal open={leaveConfirmOpen} labelledBy="leave-confirm-title" onClose={closeLeaveConfirm}>
	<div class="app-card-padded space-y-4">
		<div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
			<h2 id="leave-confirm-title" class="text-lg font-semibold text-amber-950">
				Leave session early?
			</h2>
			<ul class="mt-3 space-y-2 text-sm leading-relaxed text-amber-950/90">
				<li>
					You will be billed <strong>{formatThb(myTotalCost)}</strong> — your court and shuttle share
					for this session so far.
				</li>
				<li>Pay via PromptPay right after. Admin approves your leave once payment is confirmed.</li>
				<li>The session continues for other players until it ends.</li>
				<li>You can cancel the leave request while it is still pending review.</li>
			</ul>
		</div>

		{@render playerCostPanel(true, !isBilled, null)}

		<form method="POST" action="?/requestLeave" class="flex flex-wrap gap-2" use:enhance={handleLeaveRequest}>
			<SubmitButton
				loading={actionLoading === 'requestLeave'}
				loadingLabel="Requesting…"
				disabled={sessionActionsBusy && actionLoading !== 'requestLeave'}
				class="!w-auto flex-1"
			>
				Confirm leave request
			</SubmitButton>
			<SubmitButton
				type="button"
				variant="secondary"
				class="!w-auto flex-1"
				disabled={actionLoading === 'requestLeave'}
				onclick={closeLeaveConfirm}
			>
				Stay in session
			</SubmitButton>
		</form>
	</div>
</AppModal>

<MatchInviteModal
	open={showInviteModal}
	match={data.myInviteMatch}
	userId={data.userId}
	nowMs={nowMs}
	actionLoading={actionLoading}
	handleAction={handleAction}
/>

<MatchScoreConfirmModal
	open={showScoreConfirmModal}
	match={myScorePendingMatch}
	userId={data.userId}
	formAction="?/respondScore"
	actionLoading={actionLoading}
	isBusy={sessionActionsBusy}
	handleAction={handleAction}
/>

{#snippet playerCourtAction()}
	<SubmitButton
		type="button"
		loading={matchNavLoading}
		loadingLabel="Opening match…"
		disabled={sessionActionsBusy && !matchNavLoading}
		onclick={openSelectedCourtMatch}
	>
		Open match
	</SubmitButton>
{/snippet}

<CourtDetailModal
	open={courtDetailOpen}
	court={selectedCourtMatch}
	onClose={() => {
		courtDetailOpen = false;
		selectedCourtMatch = null;
	}}
	action={showSelectedCourtMatchAction ? playerCourtAction : undefined}
/>

<MatchSummarySheet
	open={selectedHistoryMatch !== null}
	match={selectedHistoryMatch}
	highlightUserId={data.userId}
	onClose={() => (selectedHistoryMatch = null)}
/>
