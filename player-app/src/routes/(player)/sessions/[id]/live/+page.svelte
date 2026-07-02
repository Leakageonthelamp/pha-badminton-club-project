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
	import CheckIcon from '@repo/ui/icons/CheckIcon.svelte';
	import HomeIcon from '@repo/ui/icons/HomeIcon.svelte';
	import ClipboardDocumentListIcon from '@repo/ui/icons/ClipboardDocumentListIcon.svelte';
	import { formatDate, formatDateTime, formatDurationMs, formatTime, formatUptime } from '@repo/ui/datetime';
	import MatchSummarySheet from '$lib/components/MatchSummarySheet.svelte';
	import PlayerMatchHistoryCard from '@repo/ui/components/PlayerMatchHistoryCard.svelte';
	import { playerMatchResult, formatMatchRecord } from '@repo/ui/matches';
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
		isPlayerEarlyLeave,
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
	import { t } from '@repo/ui/i18n';
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
	const playerEarlyLeave = $derived(
		isPlayerEarlyLeave(
			session.my_membership?.status ?? null,
			session.status,
			data.myLeaveRequest?.status ?? null
		)
	);
	const playerEarlyLeaveInProgress = $derived(
		playerEarlyLeave && uiState !== 'summary'
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
		if (ms <= 0) return t('common.dash');

		const totalMinutes = Math.round(ms / 60_000);
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;

		if (minutes === 0) return t('duration.hours', { hours });
		if (hours === 0) return t('duration.minutes', { minutes });
		return t('duration.hoursMinutes', { hours, minutes });
	});

	const shuttlePriceLabel = $derived(formatThb(session.shuttle_price_per_each));
	const shuttleSharedEachLabel = $derived(
		formatThb(computePlayerShuttleShare(1, session.shuttle_price_per_each))
	);

	const shuttleDetailLabel = $derived.by(() => {
		if (!session.shuttle) return shuttlePriceLabel;

		return t('shuttle.detail', {
			name: session.shuttle.name,
			speed: session.shuttle.speed,
			price: shuttlePriceLabel,
			shared: shuttleSharedEachLabel
		});
	});

	const summaryPaymentStatus = $derived(data.myPayment?.status ?? null);
	const summaryPaymentBadgeClass = $derived.by(() => {
		switch (summaryPaymentStatus) {
			case 'approved':
				return 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800';
			case 'submitted':
				return 'bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-800';
			case 'pending':
				return 'bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800';
			default:
				return 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700';
		}
	});
	const summaryHeadline = $derived.by(() => {
		if (playerEarlyLeave) {
			if (summaryPaymentStatus === 'approved') return t('sessions.live.summaryAllSettled');
			return t('sessions.live.summaryEarlyLeave');
		}
		return t('sessions.live.summaryComplete');
	});
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
		let draws = 0;

		for (const match of data.myMatchHistory) {
			const result = playerMatchResult(data.userId, match.players, match.games);
			if (result === 'win') wins += 1;
			else if (result === 'lose') losses += 1;
			else if (result === 'draw') draws += 1;
		}

		return { wins, losses, draws, played: data.myMatchHistory.length };
	});
	const mySessionDuration = $derived.by(() => {
		const membership = session.my_membership;
		if (!membership) return null;

		const startMs = Math.max(
			Date.parse(session.start_at),
			Date.parse(membership.joined_at)
		);
		const endMs = membership.left_at
			? Date.parse(membership.left_at)
			: Date.parse(session.end_at);

		if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return null;

		return {
			label: formatDurationMs(endMs - startMs),
			leftEarly: Boolean(membership.left_at)
		};
	});
	const myTotalMatchDuration = $derived.by(() => {
		let totalMs = 0;

		for (const match of data.myMatchHistory) {
			if (!match.started_at || !match.ended_at) continue;

			const startedMs = Date.parse(match.started_at);
			const endedMs = Date.parse(match.ended_at);
			if (Number.isNaN(startedMs) || Number.isNaN(endedMs) || endedMs < startedMs) continue;

			totalMs += endedMs - startedMs;
		}

		return totalMs > 0 ? formatDurationMs(totalMs) : null;
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
			try {
				await update({ reset: false });
				if (result.type === 'success') {
					paymentSlipFile = null;
				}
			} finally {
				actionLoading = null;
			}
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
				<p class="app-cost-hero-label">{t('sessions.live.yourCost')}</p>
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
							<span class="app-cost-hero-estimate">{t('common.estimate')}</span>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<div class="app-cost-lines">
			<div class="app-cost-line">
				<div class="min-w-0">
					<p class="app-cost-line-label">
						{t('sessions.live.courtFeePerPlayerLabel', { mode: courtFeePerPlayerModeLabel(session.fixed_court_fee_per_player) })}
					</p>
					<p class="app-cost-line-hint">{courtFeePerPlayerHint}</p>
				</div>
				<p class="app-cost-line-amount">{formatThb(myCourtShare)}</p>
			</div>
			<div class="app-cost-line">
				<div class="min-w-0">
					<p class="app-cost-line-label">{t('sessions.live.shuttleFee')}</p>
					<p class="app-cost-line-hint">
						{#if myShuttlesUsedDisplay === 0}
							{t('sessions.live.noShuttlesYet')}
						{:else if myShuttlesUsedDisplay === sessionShuttlesUsed}
							{myShuttlesUsedDisplay === 1 ? t('sessions.live.shuttlesFromMatches', { count: myShuttlesUsedDisplay }) : t('sessions.live.shuttlesFromMatchesPlural', { count: myShuttlesUsedDisplay })}
						{:else}
							{t('sessions.live.shuttlesMixed', { my: myShuttlesUsedDisplay, session: sessionShuttlesUsed })}
						{/if}
					</p>
				</div>
				<p class="app-cost-line-amount">{formatThb(myShuttleShare)}</p>
			</div>
		</div>

		{#if footnote && !isBilled}
			<p class="app-cost-footnote">{t('sessions.live.shuttleMayIncrease')}</p>
		{/if}
	</div>
{/snippet}

<section class="space-y-6">
	<DashboardHero
		eyebrow={uiState === 'summary' ? t('sessions.live.eyebrow.wrapUp') : playerEarlyLeaveInProgress ? t('sessions.live.eyebrow.earlyLeave') : t('sessions.live.eyebrow.live')}
		title={session.name}
		subtitle={session.club?.name ?? t('sessions.detail.title')}
	>
		<div class="flex flex-wrap items-center gap-2">
			<span class="rounded-full px-2 py-0.5 text-xs font-medium {sessionStatusBadgeClass(session.status)}">
				{sessionStatusLabel(session.status)}
			</span>
			{#if playerEarlyLeave}
				<span class="app-hero-stat app-hero-stat--warn">{t('sessions.playerStatus.earlyLeaved')}</span>
			{:else if sessionEnded}
				<span class="app-hero-stat app-hero-stat--warn">{t('sessions.live.sessionEnded')}</span>
			{/if}
			{#if uiState === 'summary'}
				<span class="app-hero-stat app-hero-stat--success">{t('common.done')}</span>
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

		{#if sessionEnded && !playerEarlyLeave}
			<div
				class="rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
			>
				{t('sessions.live.sessionEndedNoBreak')}
			</div>
		{:else if playerEarlyLeaveInProgress}
			<div
				class="rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
			>
				<strong>{t('sessions.live.leftEarlyStrong')}</strong>
				{#if uiState === 'payment_due'}
					{t('sessions.live.leftEarlyPaymentDue')}
				{:else if uiState === 'payment_submitted'}
					{t('sessions.live.leftEarlySubmitted')}
				{:else if uiState === 'awaiting_leave'}
					{t('sessions.live.leftEarlyAwaitingLeave')}
				{:else}
					{t('sessions.live.leftEarlyProcessing')}
				{/if}
			</div>
		{/if}

		{#if breakBlocked}
			<div
				class="app-session-countdown flex flex-col gap-3 border-brand-200 bg-brand-50/80 dark:border-brand-800 dark:bg-brand-900/30"
			>
				<div class="flex items-center justify-between gap-3">
					<span class="app-session-countdown-label text-brand-800 dark:text-brand-300">{t('sessions.live.yourStatus')}</span>
					<PlayerStatusBadge
						status={myLiveStatus === 'playing' || hasOpenCourtMatch ? 'playing' : myLiveStatus}
					/>
				</div>
				{#if showInviteModal}
					<p class="text-sm leading-relaxed text-brand-900 dark:text-brand-200">
						{t('sessions.live.matchInviteBlocked')}
					</p>
				{:else}
					<p class="text-sm leading-relaxed text-brand-900 dark:text-brand-200">
						{t('sessions.live.inMatchBlocked')}
					</p>
				{/if}
				{#if data.myOpenMatch && shouldOpenMatchLive(data.myOpenMatch)}
					<SubmitButton
						type="button"
						variant="accent"
						loading={matchNavLoading}
						loadingLabel={t('common.openingMatch')}
						disabled={sessionActionsBusy && !matchNavLoading}
						onclick={openMatchLive}
					>
						{t('sessions.live.openMatchLive')}
					</SubmitButton>
				{/if}
			</div>
		{:else if playerEarlyLeaveInProgress}
			<div
				class="app-session-countdown flex flex-col gap-3 border-sky-200 bg-sky-50/80 dark:border-sky-800 dark:bg-sky-950/40"
			>
				<div class="flex items-center justify-between gap-3">
					<span class="app-session-countdown-label text-sky-800 dark:text-sky-300">{t('sessions.live.yourStatus')}</span>
					<PlayerStatusBadge status={myLiveStatus} />
				</div>
				<p class="text-sm leading-relaxed text-sky-900 dark:text-sky-200">
					{#if uiState === 'payment_due'}
						{t('sessions.live.waitingPromptPay')}
					{:else if uiState === 'payment_submitted'}
						{t('sessions.live.waitingPaymentConfirmShort')}
					{:else if uiState === 'awaiting_leave'}
						{t('sessions.live.leaveApprovedPending')}
					{:else}
						{t('sessions.live.earlyLeaveInProgress')}
					{/if}
				</p>
			</div>
		{:else if myLiveStatus === 'idle' || myLiveStatus === 'break'}
			<div
				class="app-session-countdown flex flex-col gap-3 border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/50"
			>
					<div class="flex items-center justify-between gap-3">
						<span class="app-session-countdown-label text-slate-700 dark:text-slate-300 dark:text-slate-600">{t('sessions.live.yourStatus')}</span>
						<PlayerStatusBadge status={myLiveStatus} />
					</div>

					{#if myLiveStatus === 'idle' && myIdleLabel}
						<div>
							<p class="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('sessions.live.idleTime')}</p>
							<p
								class="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100"
								aria-live="polite"
							>
								{myIdleLabel}
							</p>
						</div>
					{/if}

					{#if myLiveStatus === 'idle'}
						<p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400 dark:text-slate-500">
							{t('sessions.live.availableForMatch')}
						</p>
						<form method="POST" action="?/toggleBreak" use:enhance={handleAction('breakOn')}>
							<input type="hidden" name="on_break" value="true" />
							<SubmitButton
								variant="secondary"
								loading={actionLoading === 'breakOn'}
								disabled={sessionEnded || (sessionActionsBusy && actionLoading !== 'breakOn')}
							>
								{t('sessions.live.takeBreak')}
							</SubmitButton>
						</form>
					{:else}
						<p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400 dark:text-slate-500">
							{t('sessions.live.onBreakCannotAssign')}
						</p>
						<form method="POST" action="?/toggleBreak" use:enhance={handleAction('breakOff')}>
							<input type="hidden" name="on_break" value="false" />
							<SubmitButton
								variant="accent"
								loading={actionLoading === 'breakOff'}
								disabled={sessionEnded || (sessionActionsBusy && actionLoading !== 'breakOff')}
							>
								{t('sessions.live.continuePlaying')}
							</SubmitButton>
						</form>
					{/if}
				</div>
		{/if}
	{/if}

	<FormToast message={toastMessage} variant={toastVariant} />

	{#if uiState === 'summary'}
		<section
			class="overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-brand-50 shadow-sm ring-1 ring-emerald-100/80 dark:border-emerald-800/80 dark:from-emerald-950/40 dark:via-slate-900 dark:to-brand-900/20 dark:ring-emerald-900/40"
		>
			<div class="relative px-4 pb-5 pt-8 text-center sm:px-6">
				<div
					class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 shadow-sm ring-4 ring-white dark:bg-emerald-900/50 dark:ring-slate-800"
					aria-hidden="true"
				>
					<CheckIcon class="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
				</div>
				<h2 class="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{summaryHeadline}</h2>
				<p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 dark:text-slate-500">
					{t('sessions.live.sessionRecap', { atClub: session.club?.name ? t('sessions.live.summaryAtClub', { clubName: session.club.name }) : '' })}
				</p>
			</div>

			<div
				class="flex flex-col items-stretch gap-4 border-y border-emerald-100/80 bg-white/70 px-4 py-5 dark:border-emerald-900/50 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:justify-between sm:gap-6 lg:px-8"
			>
				<div class="min-w-0 sm:flex-1">
					<p class="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">{t('common.start')}</p>
					<p class="mt-1 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100 sm:text-base">
						{formatDate(session.start_at)}
					</p>
					<p class="mt-0.5 text-sm font-medium tabular-nums text-slate-600 dark:text-slate-400 dark:text-slate-500">
						{formatTime(session.start_at)}
					</p>
				</div>
				<div class="hidden h-10 w-px shrink-0 self-center bg-emerald-200 dark:bg-emerald-800 sm:block" aria-hidden="true">
				</div>
				<div
					class="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 shadow-sm ring-1 ring-emerald-100/80 dark:border-emerald-800 dark:bg-emerald-950/40 dark:ring-emerald-900/50 sm:shrink-0 sm:min-w-[8.5rem] sm:self-center sm:px-5 sm:text-center"
				>
					<p class="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{t('common.duration')}</p>
					<p class="mt-1 whitespace-nowrap text-lg font-semibold text-emerald-900 dark:text-emerald-200">
						{sessionDurationLabel}
					</p>
				</div>
				<div class="hidden h-10 w-px shrink-0 self-center bg-emerald-200 dark:bg-emerald-800 sm:block" aria-hidden="true">
				</div>
				<div class="min-w-0 sm:flex-1 sm:text-right">
					<p class="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">{t('common.end')}</p>
					<p class="mt-1 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100 sm:text-base">
						{formatDate(session.end_at)}
					</p>
					<p class="mt-0.5 text-sm font-medium tabular-nums text-slate-600 dark:text-slate-400 dark:text-slate-500">
						{formatTime(session.end_at)}
					</p>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-3 p-4 sm:p-6">
				<div class="col-span-2 space-y-3">
					{@render playerCostPanel(true, true, summaryPaymentStatus)}
					<p class="app-history-stat-hint px-1">
						{#if summaryPaymentStatus === 'approved'}
							{t('sessions.live.paymentConfirmedSet')}
						{:else if summaryPaymentStatus === 'submitted'}
							{t('sessions.live.waitingAdminTransfer')}
						{:else if summaryPaymentStatus === 'pending'}
							{t('sessions.live.completePromptPay')}
						{:else}
							{t('sessions.live.yourShare')}
						{/if}
					</p>
				</div>

				<div class="app-history-stat">
					<p class="app-history-stat-label">{t('common.venue')}</p>
					<p class="app-history-stat-value text-base leading-snug">{session.venue_name ?? t('common.dash')}</p>
				</div>

				<div class="app-history-stat">
					<p class="app-history-stat-label">{t('common.courts')}</p>
					<p class="app-history-stat-value">{session.court_count}</p>
					{#if session.fixed_court_fee_per_player === null}
						<p class="app-history-stat-hint">
							{formatThb(session.court_fee_per_hour)}/hr
						</p>
					{/if}
				</div>

				<div class="app-history-stat">
					<p class="app-history-stat-label">{t('sessions.live.matchesPlayed')}</p>
					<p class="app-history-stat-value">{myMatchRecord.played}</p>
					<p class="app-history-stat-hint">
						{#if myMatchRecord.played === 0}
							{t('sessions.live.noMatchesShort')}
						{:else}
							{formatMatchRecord(myMatchRecord.wins, myMatchRecord.losses, myMatchRecord.draws)}
						{/if}
					</p>
				</div>

				<div class="app-history-stat">
					<p class="app-history-stat-label">{t('sessions.live.yourShuttles')}</p>
					<p class="app-history-stat-value">{myShuttlesUsedDisplay}</p>
					<p class="app-history-stat-hint">{t('sessions.live.fromYourMatches')}</p>
				</div>

				<div class="app-history-stat">
					<p class="app-history-stat-label">{t('sessions.live.timeInSession')}</p>
					<p class="app-history-stat-value font-mono tabular-nums">
						{mySessionDuration?.label ?? t('common.dash')}
					</p>
					<p class="app-history-stat-hint">
						{#if mySessionDuration?.leftEarly}
							{t('sessions.live.untilLeftEarly')}
						{:else}
							{t('sessions.live.throughSessionEnd')}
						{/if}
					</p>
				</div>

				<div class="app-history-stat">
					<p class="app-history-stat-label">{t('sessions.live.matchTime')}</p>
					<p class="app-history-stat-value font-mono tabular-nums">
						{myTotalMatchDuration ?? t('common.dash')}
					</p>
					<p class="app-history-stat-hint">
						{#if myMatchRecord.played === 0}
							{t('sessions.live.noMatchesPlayed')}
						{:else}
							{t('sessions.live.totalOnCourt')}
						{/if}
					</p>
				</div>
			</div>

			<div class="border-t border-emerald-100/80 bg-white/70 px-4 py-5 dark:border-emerald-900/50 dark:bg-slate-900/40 sm:px-6">
				<div class="flex items-center justify-between gap-2">
					<h3 class="text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">{t('sessions.live.yourMatches')}</h3>
					{#if myMatchRecord.played > 0}
						<span
							class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
						>
							{formatMatchRecord(myMatchRecord.wins, myMatchRecord.losses, myMatchRecord.draws)}
						</span>
					{/if}
				</div>
				{#if sortedMyMatchHistory.length === 0}
					<p class="mt-3 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
						{t('sessions.live.noRecordedMatch')}
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

			<div class="border-t border-emerald-100/80 bg-white/50 px-4 py-4 dark:border-emerald-900/50 dark:bg-slate-900/30 sm:px-6">
				<SubmitButton
					type="button"
					loading={homeNavLoading}
					loadingLabel={t('common.goingHome')}
					disabled={summaryActionsBusy && !homeNavLoading}
					onclick={goHomeFromSummary}
				>
					<span class="inline-flex items-center justify-center gap-2">
						<HomeIcon class="h-5 w-5" />
						{t('sessions.live.backToHome')}
					</span>
				</SubmitButton>
			</div>
		</section>
	{:else}
		{@render playerCostPanel(true, true, data.myPayment?.status ?? null)}

		<section class="app-detail-section">
			<div
				class="flex flex-col items-stretch gap-4 border-b border-brand-100 bg-gradient-to-br from-brand-50 via-white to-brand-50/50 px-4 py-5 dark:border-brand-800 dark:from-slate-900 dark:via-slate-900 dark:to-brand-900/30 sm:flex-row sm:items-center sm:justify-between sm:gap-6 lg:px-8"
			>
				<div class="min-w-0 sm:flex-1">
					<p class="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">{t('common.start')}</p>
					<p class="mt-1 text-base font-semibold leading-snug text-slate-900 dark:text-slate-100">
						{formatDate(session.start_at)}
					</p>
					<p class="mt-0.5 text-sm font-medium tabular-nums text-slate-600 dark:text-slate-400 dark:text-slate-500">
						{formatTime(session.start_at)}
					</p>
				</div>
				<div class="hidden h-10 w-px shrink-0 self-center bg-brand-200 dark:bg-brand-800 sm:block" aria-hidden="true">
				</div>
				<div
					class="rounded-2xl border border-brand-100 bg-white/80 px-4 py-3 shadow-sm ring-1 ring-brand-100/80 dark:border-brand-800 dark:bg-slate-800/80 dark:ring-brand-900/50 sm:shrink-0 sm:min-w-[8.5rem] sm:self-center sm:px-5 sm:text-center"
				>
					<p class="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">{t('common.duration')}</p>
					<p class="mt-1 whitespace-nowrap text-lg font-semibold text-brand-800 dark:text-brand-200">
						{sessionDurationLabel}
					</p>
				</div>
				<div class="hidden h-10 w-px shrink-0 self-center bg-brand-200 dark:bg-brand-800 sm:block" aria-hidden="true">
				</div>
				<div class="min-w-0 sm:flex-1 sm:text-right">
					<p class="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">{t('common.end')}</p>
					<p class="mt-1 text-base font-semibold leading-snug text-slate-900 dark:text-slate-100">
						{formatDate(session.end_at)}
					</p>
					<p class="mt-0.5 text-sm font-medium tabular-nums text-slate-600 dark:text-slate-400 dark:text-slate-500">
						{formatTime(session.end_at)}
					</p>
				</div>
			</div>

			<div class="app-detail-section-body space-y-5">
				<div class="app-detail-section-header">
					<span class="app-detail-section-icon" aria-hidden="true">
						<ClipboardDocumentListIcon class="h-5 w-5" />
					</span>
					<div>
						<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('sessions.live.sessionDetails')}</h2>
						<p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('sessions.live.sessionDetailsHint')}</p>
					</div>
				</div>

				<dl class="app-detail-contact-grid">
					<div class="app-detail-contact-item app-detail-contact-item--wide">
						<dt class="app-detail-contact-label">
							<span class="inline-flex items-center gap-1.5">
								<BuildingIcon class="h-4 w-4 text-brand-500" />
								{t('common.venue')}
							</span>
						</dt>
						<dd class="app-detail-contact-value text-base">{session.venue_name ?? t('common.dash')}</dd>
					</div>
				</dl>

				<dl class="app-detail-meta-grid">
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">{t('common.courts')}</dt>
						<dd class="app-detail-meta-value">
							<span class="text-lg font-semibold text-brand-700">{session.court_count}</span>
						</dd>
					</div>
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">{t('sessions.live.courtFeePerHour')}</dt>
						<dd class="app-detail-meta-value text-base text-brand-800">
							{formatThb(session.court_fee_per_hour)}
						</dd>
					</div>
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">{t('sessions.live.shuttleUsage')}</dt>
						<dd class="app-detail-meta-value">
							<span class="text-lg font-semibold text-brand-700">{sessionShuttlesUsed}</span>
							<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
								{#if completedSessionMatchCount === 0}
									{t('sessions.live.noCompletedMatches')}
								{:else}
									{completedSessionMatchCount === 1 ? t('sessions.live.shuttleSingular') : t('sessions.live.shuttlesPluralShort')} {completedSessionMatchCount === 1 ? t('sessions.live.fromCompletedMatch', { count: completedSessionMatchCount }) : t('sessions.live.fromCompletedMatches', { count: completedSessionMatchCount })}
								{/if}
							</p>
						</dd>
					</div>
					<div class="app-detail-meta-item sm:col-span-2">
						<dt class="app-detail-meta-label">{t('sessions.detail.shuttle')}</dt>
						<dd class="app-detail-meta-value">
							{#if session.shuttle}
								<p class="text-base font-semibold text-slate-900 dark:text-slate-100">{session.shuttle.name}</p>
								<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
									{t('sessions.live.speedEachShared', {
										speed: session.shuttle.speed,
										price: shuttlePriceLabel,
										shared: shuttleSharedEachLabel
									})}
								</p>
								<p class="mt-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
									{#if myShuttlesUsed > 0}
										{t('sessions.live.shuttleShareInCost', { count: myShuttlesUsed })}
									{:else}
										{t('sessions.live.shuttleShareWhenPlay')}
									{/if}
								</p>
							{:else}
								<p class="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">{shuttleDetailLabel}</p>
							{/if}
						</dd>
					</div>
				</dl>
			</div>
		</section>

		<AppCard class="space-y-4">
			<SectionHeading title={t('sessions.live.activePlayers')} />
			{#if data.activePlayers.length === 0}
				<EmptyState message={t('sessions.live.noActivePlayers')} />
			{:else}
				<ul class="divide-y divide-slate-100 dark:divide-slate-800">
					{#each data.activePlayers as player (player.id)}
						{@const liveStatus = derivePlayerLiveStatus({
							membershipStatus: player.status,
							activity: player.activity
						})}
						<li class="flex items-center gap-3 py-3">
							<UserAvatar
								displayName={player.profile?.display_name ?? t('common.player')}
								avatarUrl={player.profile?.avatar_url ?? null}
								size="sm"
							/>
							<div class="min-w-0 flex-1">
								<p class="truncate font-medium text-slate-800 dark:text-slate-200">
									{player.profile?.display_name ?? t('common.unknownPlayer')}
									{#if player.is_me}
										<span class="text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('common.youParen')}</span>
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
			<SectionHeading title={t('sessions.live.matchHistory')} />
			{#if sortedMyMatchHistory.length === 0}
				<EmptyState message={t('sessions.live.noMatchesRecorded')} />
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
			<SectionHeading title={t('sessions.live.courtsSection')} />
			<CourtGrid
				courtCount={session.court_count}
				matches={data.courtGridMatches}
				onCourtClick={handleCourtClick}
			/>
		</AppCard>

		<AppCard class="space-y-4">
			<SectionHeading title={t('sessions.live.earlyLeave')} />
			{#if matchLocked}
				<p class="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">{t('sessions.live.finishMatchFirst')}</p>
			{:else if uiState === 'leave_pending'}
				<p class="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
					{t('sessions.live.leavePending')}
				</p>
				<form method="POST" action="?/cancelLeave" use:enhance={handleAction('cancelLeave')}>
					<SubmitButton
						variant="secondary"
						loading={actionLoading === 'cancelLeave'}
						disabled={sessionActionsBusy && actionLoading !== 'cancelLeave'}
					>
						{t('sessions.live.cancelLeaveRequest')}
					</SubmitButton>
				</form>
			{:else if canRequestEarlyLeave(session.my_membership, data.myLeaveRequest?.status ?? null, sessionEnded)}
				<p class="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
					{t('sessions.live.leaveBeforeEnd')}
				</p>
				<SubmitButton type="button" onclick={() => (leaveConfirmOpen = true)}>
					{t('sessions.detail.requestLeave')}
				</SubmitButton>
			{:else if uiState === 'awaiting_leave'}
				<p class="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
					{t('sessions.live.leaveApprovedPending')}
				</p>
			{:else if uiState === 'payment_submitted'}
				<p class="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">{t('sessions.live.paymentSubmittedToast')}</p>
			{:else if sessionEnded}
				<p class="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
					{t('sessions.live.waitSettlement')}
				</p>
			{:else}
				<p class="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
					{t('sessions.live.stayOrLeave')}
				</p>
			{/if}
		</AppCard>
	{/if}
</section>

<AppModal
	open={showPaymentModal}
	labelledBy="payment-modal-title"
	closeOnBackdrop={false}
	closeOnEscape={false}
>
	<div class="app-card-padded space-y-4">
		<h2 id="payment-modal-title" class="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('sessions.live.paySessionFee')}</h2>
		<p class="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
			{t('sessions.live.paySessionFeeBody', { amount: formatThb(myTotalCost) })}
		</p>

		{@render playerCostPanel(false, !isBilled, data.myPayment?.status ?? null)}

		{#if promptPayTarget}
			<PaymentQr target={promptPayTarget} amount={myTotalCost} />
		{:else}
			<EmptyState message={t('payments.cancellationFee.noPromptPay')} />
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
					variant="accent"
					loading={actionLoading === 'submitPayment'}
					disabled={!paymentSlipFile}
				>
					{t('sessions.live.ivePaid')}
				</SubmitButton>
			</form>
		{:else}
			<p class="text-center text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
				{paymentStatusLabel(data.myPayment?.status ?? 'submitted')}
			</p>
		{/if}
	</div>
</AppModal>

<AppModal open={leaveConfirmOpen} labelledBy="leave-confirm-title" onClose={closeLeaveConfirm}>
	<div class="app-card-padded space-y-4">
		<div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-800 dark:bg-amber-950/40">
			<h2 id="leave-confirm-title" class="text-lg font-semibold text-amber-950 dark:text-amber-200">
				{t('sessions.live.leaveEarlyTitle')}
			</h2>
			<ul class="mt-3 space-y-2 text-sm leading-relaxed text-amber-950/90 dark:text-amber-200/90">
				<li>
					{t('sessions.live.leaveEarlyBill', { amount: formatThb(myTotalCost) })}
				</li>
				<li>{t('sessions.live.leaveEarlyPayAfter')}</li>
				<li>{t('sessions.live.leaveEarlySessionContinues')}</li>
				<li>{t('sessions.live.leaveEarlyCancelPending')}</li>
			</ul>
		</div>

		{@render playerCostPanel(true, !isBilled, null)}

		<form method="POST" action="?/requestLeave" class="flex flex-wrap gap-2" use:enhance={handleLeaveRequest}>
			<SubmitButton
				loading={actionLoading === 'requestLeave'}
				loadingLabel={t('common.requesting')}
				disabled={sessionActionsBusy && actionLoading !== 'requestLeave'}
				class="!w-auto flex-1"
			>
				{t('sessions.live.confirmLeaveRequest')}
			</SubmitButton>
			<SubmitButton
				type="button"
				variant="secondary"
				class="!w-auto flex-1"
				disabled={actionLoading === 'requestLeave'}
				onclick={closeLeaveConfirm}
			>
				{t('sessions.live.stayInSession')}
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
		variant="accent"
		loading={matchNavLoading}
		loadingLabel={t('common.openingMatch')}
		disabled={sessionActionsBusy && !matchNavLoading}
		onclick={openSelectedCourtMatch}
	>
		{t('sessions.live.openMatch')}
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
