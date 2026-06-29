<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import CourtGrid from '@repo/ui/components/CourtGrid.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import FormToast from '@repo/ui/components/FormToast.svelte';
	import PlayerStatusBadge from '@repo/ui/components/PlayerStatusBadge.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import BuildingIcon from '@repo/ui/icons/BuildingIcon.svelte';
	import HomeIcon from '@repo/ui/icons/HomeIcon.svelte';
	import LayersIcon from '@repo/ui/icons/LayersIcon.svelte';
	import { formatDateTime, formatUptime } from '@repo/ui/datetime';
	import { formatMatchScore } from '@repo/ui/matches';
	import { formatThb, paymentStatusLabel } from '@repo/ui/payments';
	import { clampIdleSince, derivePlayerLiveStatus } from '@repo/ui/sessionStatus';
	import PaymentQr from '$lib/components/PaymentQr.svelte';
	import {
		canRequestEarlyLeave,
		deriveLiveSessionUiState,
		shouldShowPaymentModal
	} from '$lib/sessions/liveState';
	import {
		isInUnresolvedMatch,
		matchLiveHref,
		shouldOpenMatchLive
	} from '$lib/sessions/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase/client';
	import { sessionStatusBadgeClass, sessionStatusLabel } from '$lib/types/session';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { onMount } from 'svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let nowMs = $state(Date.now());
	let actionLoading = $state<string | null>(null);
	let inviteModalDismissed = $state(false);
	let autoNavigatedMatchId = $state<string | null>(null);

	const session = $derived(data.session);
	const uiState = $derived(
		deriveLiveSessionUiState({
			membershipStatus: session.my_membership?.status ?? null,
			leaveRequestStatus: data.myLeaveRequest?.status ?? null,
			paymentStatus: data.myPayment?.status ?? null,
			sessionClosed: session.status === 'closed'
		})
	);
	const paymentAmount = $derived(data.myPayment?.total_amount ?? data.perPlayerCost);
	const promptPayTarget = $derived(data.clubPromptPay.promptpay_target ?? '');
	const toastMessage = $derived(form?.message ?? null);
	const toastVariant = $derived(form?.success ? 'success' : 'error');
	const uptimeLabel = $derived(formatUptime(session.start_at, nowMs));
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

	const summaryCourtFee = $derived(data.myPayment?.total_amount ?? data.perPlayerCost);
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
	const inviteCountdownMs = $derived.by(() => {
		const expiresAt = data.myPendingInvite?.invite_expires_at;
		if (!expiresAt) return 0;
		return Math.max(0, new Date(expiresAt).getTime() - nowMs);
	});
	const inviteCountdownLabel = $derived(`${Math.ceil(inviteCountdownMs / 1000)}s`);
	const showInviteModal = $derived(Boolean(data.myPendingInvite) && !inviteModalDismissed);
	const matchLocked = $derived(
		myLiveStatus === 'playing' || isInUnresolvedMatch(data.myOpenMatch)
	);
	const myScorePendingMatch = $derived(
		data.myOpenMatch?.status === 'score_pending' ? data.myOpenMatch : null
	);
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
		if (!browser || !shouldOpenMatchLive(data.myOpenMatch)) return;
		if (autoNavigatedMatchId === data.myOpenMatch?.id) return;
		autoNavigatedMatchId = data.myOpenMatch!.id;
		void goto(matchLiveHref(session.id, data.myOpenMatch!.id));
	});

	$effect(() => {
		if (!data.myPendingInvite) {
			inviteModalDismissed = false;
		}
	});

	onMount(() => {
		const supabase = createSupabaseBrowserClient();
		const sessionId = session.id;
		const invalidateLive = () => void invalidate('app:live-session');

		const channel = supabase
			.channel(`player-live-session-${sessionId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'session_players',
					filter: `session_id=eq.${sessionId}`
				},
				invalidateLive
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'payments',
					filter: `session_id=eq.${sessionId}`
				},
				invalidateLive
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'session_leave_requests',
					filter: `session_id=eq.${sessionId}`
				},
				invalidateLive
			)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'sessions',
					filter: `id=eq.${sessionId}`
				},
				invalidateLive
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'matches',
					filter: `session_id=eq.${sessionId}`
				},
				invalidateLive
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'match_players',
					filter: `session_id=eq.${sessionId}`
				},
				invalidateLive
			)
			.subscribe();

		return () => {
			void supabase.removeChannel(channel);
		};
	});

	const handleAction =
		(key: string): SubmitFunction =>
		() => {
			actionLoading = key;
			return async ({ update }) => {
				await update({ reset: false });
				actionLoading = null;
			};
		};
</script>

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
			{#if uiState === 'summary'}
				<span class="app-hero-stat app-hero-stat--success">Done</span>
			{/if}
		</div>
	</DashboardHero>

	{#if session.status === 'in_progress'}
		<div class="grid gap-3 sm:grid-cols-2">
			<div class="app-session-countdown border-emerald-200 bg-emerald-50/80">
				<span class="app-session-countdown-label text-emerald-800">
					<span class="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true"></span>
					Uptime
				</span>
				<span class="app-session-countdown-value text-emerald-900" aria-live="polite">{uptimeLabel}</span>
			</div>

			{#if myLiveStatus === 'idle' || myLiveStatus === 'break'}
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
							<SubmitButton variant="secondary" loading={actionLoading === 'breakOn'}>
								Take a break
							</SubmitButton>
						</form>
					{:else}
						<p class="text-sm leading-relaxed text-slate-600">
							You are on break. The admin cannot assign you until you continue.
						</p>
						<form method="POST" action="?/toggleBreak" use:enhance={handleAction('breakOff')}>
							<input type="hidden" name="on_break" value="false" />
							<SubmitButton loading={actionLoading === 'breakOff'}>Continue playing</SubmitButton>
						</form>
					{/if}
				</div>
			{:else if myLiveStatus === 'playing' || matchLocked}
				<div class="app-session-countdown flex flex-col gap-3 border-brand-200 bg-brand-50/80">
					<div class="flex items-center justify-between gap-3">
						<span class="app-session-countdown-label text-brand-800">Your status</span>
						<PlayerStatusBadge status="playing" />
					</div>
					<p class="text-sm leading-relaxed text-brand-900">
						You are in a match. Leave, break, and other session actions are unavailable until the
						match ends.
					</p>
					{#if data.myOpenMatch && shouldOpenMatchLive(data.myOpenMatch)}
						<SubmitButton
							type="button"
							onclick={() => goto(matchLiveHref(session.id, data.myOpenMatch!.id))}
						>
							Open match live
						</SubmitButton>
					{/if}
				</div>
			{/if}
		</div>
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
				<div class="app-history-stat col-span-2 border-emerald-100/80 bg-white/90">
					<p class="app-history-stat-label">Court fee</p>
					<div class="mt-1.5 flex flex-wrap items-center gap-2">
						<p class="text-2xl font-bold tabular-nums text-slate-900">
							{formatThb(summaryCourtFee)}
						</p>
						{#if summaryPaymentStatus}
							<span
								class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 {summaryPaymentBadgeClass}"
							>
								{paymentStatusLabel(summaryPaymentStatus)}
							</span>
						{/if}
					</div>
					<p class="app-history-stat-hint">
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
			</div>

			<div class="border-t border-emerald-100/80 bg-white/50 px-4 py-4 sm:px-6">
				<button type="button" class="app-btn-primary w-full" onclick={() => goto('/')}>
					<span class="inline-flex items-center justify-center gap-2">
						<HomeIcon class="h-5 w-5" />
						Back to home
					</span>
				</button>
			</div>
		</section>
	{:else}
		<AppCard class="space-y-4">
			<SectionHeading title="Your cost" />
			<p class="text-2xl font-semibold text-slate-900">{formatThb(paymentAmount)}</p>
			<p class="text-sm text-slate-600">
				Estimated court share for this session ({data.activePlayerCount} active player{data.activePlayerCount === 1 ? '' : 's'}).
				Shuttle costs will appear here when matches are recorded.
			</p>
			{#if data.myPayment}
				<p class="text-sm text-slate-600">
					Payment status: {paymentStatusLabel(data.myPayment.status)}
				</p>
			{/if}
		</AppCard>

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
									Your shuttle share appears in your cost when matches are recorded.
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
			{#if data.myMatchHistory.length === 0}
				<EmptyState message="No matches recorded yet." />
			{:else}
				<ul class="divide-y divide-slate-100">
					{#each data.myMatchHistory as match (match.id)}
						<li class="py-3">
							<p class="font-medium text-slate-800">
								Court {match.court_number}
								{#if match.games.length}
									· {formatMatchScore(match.games)}
								{/if}
							</p>
							<p class="text-xs text-slate-500">
								{match.shuttles_used} shuttle{match.shuttles_used === 1 ? '' : 's'}
							</p>
						</li>
					{/each}
				</ul>
			{/if}
		</AppCard>

		<AppCard class="space-y-4">
			<SectionHeading title="Courts" />
			<CourtGrid courtCount={session.court_count} matches={data.courtGridMatches} />
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
					<SubmitButton variant="secondary" loading={actionLoading === 'cancelLeave'}>
						Cancel leave request
					</SubmitButton>
				</form>
			{:else if canRequestEarlyLeave(session.my_membership, data.myLeaveRequest?.status ?? null)}
				<p class="text-sm text-slate-600">
					You can leave early without playing a match. You will still owe your court-fee share.
				</p>
				<form method="POST" action="?/requestLeave" use:enhance={handleAction('requestLeave')}>
					<SubmitButton loading={actionLoading === 'requestLeave'}>Request to leave</SubmitButton>
				</form>
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
			Transfer exactly {formatThb(paymentAmount)} using PromptPay, then tap “I've paid”.
		</p>

		{#if promptPayTarget}
			<PaymentQr target={promptPayTarget} amount={paymentAmount} />
		{:else}
			<EmptyState message="Club PromptPay is not configured. Contact the admin." />
		{/if}

		{#if uiState === 'payment_due'}
			<form method="POST" action="?/submitPayment" use:enhance={handleAction('submitPayment')}>
				<SubmitButton loading={actionLoading === 'submitPayment'}>I've paid</SubmitButton>
			</form>
		{:else}
			<p class="text-center text-sm text-slate-600">
				{paymentStatusLabel(data.myPayment?.status ?? 'submitted')}
			</p>
		{/if}
	</div>
</AppModal>

<AppModal open={showInviteModal} labelledBy="match-found-title" onClose={() => (inviteModalDismissed = true)}>
	<div class="app-card-padded space-y-4">
		<h2 id="match-found-title" class="text-lg font-semibold text-slate-900">Match found</h2>
		<p class="text-sm text-slate-600">
			You have {inviteCountdownLabel} to accept or reject this match on Court
			{data.myPendingInvite?.court_number ?? '—'}.
		</p>
		<div class="flex justify-end gap-2">
			<form method="POST" action="?/respondInvite" use:enhance={handleAction('rejectInvite')}>
				<input type="hidden" name="match_id" value={data.myPendingInvite?.id ?? ''} />
				<input type="hidden" name="accept" value="false" />
				<SubmitButton variant="secondary" loading={actionLoading === 'rejectInvite'}>
					Reject
				</SubmitButton>
			</form>
			<form method="POST" action="?/respondInvite" use:enhance={handleAction('acceptInvite')}>
				<input type="hidden" name="match_id" value={data.myPendingInvite?.id ?? ''} />
				<input type="hidden" name="accept" value="true" />
				<SubmitButton loading={actionLoading === 'acceptInvite'}>Accept</SubmitButton>
			</form>
		</div>
	</div>
</AppModal>

<AppModal open={showScoreConfirmModal} labelledBy="score-result-title" onClose={() => {}}>
	<div class="app-card-padded space-y-4">
		<h2 id="score-result-title" class="text-lg font-semibold text-slate-900">Confirm score result</h2>
		{#if myScorePendingMatch?.games.length}
			<p class="text-sm text-slate-600">{formatMatchScore(myScorePendingMatch.games)}</p>
		{/if}
		<div class="flex justify-end gap-2">
			<form method="POST" action="?/respondScore" use:enhance={handleAction('rejectScore')}>
				<input type="hidden" name="match_id" value={myScorePendingMatch?.id ?? ''} />
				<input type="hidden" name="accept" value="false" />
				<SubmitButton variant="secondary" loading={actionLoading === 'rejectScore'}>
					Reject
				</SubmitButton>
			</form>
			<form method="POST" action="?/respondScore" use:enhance={handleAction('acceptScore')}>
				<input type="hidden" name="match_id" value={myScorePendingMatch?.id ?? ''} />
				<input type="hidden" name="accept" value="true" />
				<SubmitButton loading={actionLoading === 'acceptScore'}>Accept</SubmitButton>
			</form>
		</div>
	</div>
</AppModal>
