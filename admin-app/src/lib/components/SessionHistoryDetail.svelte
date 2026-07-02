<script lang="ts">
	import { t } from '$lib/i18n';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import MatchHistoryCard from '@repo/ui/components/MatchHistoryCard.svelte';
	import MatchSummaryModal from '@repo/ui/components/MatchSummaryModal.svelte';
	import RichTextDisplay from '@repo/ui/components/RichTextDisplay.svelte';
	import SlipPreviewButton from '@repo/ui/components/SlipPreviewButton.svelte';
	import SlipPreviewModal from '@repo/ui/components/SlipPreviewModal.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import { formatDateTime } from '@repo/ui/datetime';
	import { formatThb, paymentStatusLabel, cancellationFeeStatusLabel, courtFeePerPlayerModeHint, courtFeePerPlayerModeLabel } from '@repo/ui/payments';
	import type { PaymentStatus } from '@repo/ui/payments';
	import { buildSessionHistorySummary, isAttendedPlayer, isOutstandingCancellationFee } from '$lib/sessions/sessionHistory';
	import { formatThb as formatClubThb } from '$lib/types/club';
	import type { MatchWithDetails } from '$lib/types/match';
	import type { SessionPaymentWithProfile } from '$lib/types/payment';
	import {
		matchTypeLabel,
		sessionPlayerStatusLabel,
		sessionStatusBadgeClass,
		sessionStatusHeroClass,
		sessionStatusLabel,
		type SessionDetail,
		type SessionPlayerWithProfile
	} from '$lib/types/session';
	import { sessionCancelDetail } from '$lib/sessions/sessionCancel';
	import { slipPreviewUrl } from '$lib/slips';
	import SessionCancellationFees from '$lib/components/SessionCancellationFees.svelte';

	let {
		session,
		players,
		payments,
		matches = [],
		canManageFees = false,
		cancellationFees = [],
		sessionId = '',
		feeActionLoading = $bindable<string | null>(null)
	}: {
		session: SessionDetail;
		players: SessionPlayerWithProfile[];
		payments: SessionPaymentWithProfile[];
		matches?: MatchWithDetails[];
		canManageFees?: boolean;
		cancellationFees?: SessionPlayerWithProfile[];
		sessionId?: string;
		feeActionLoading?: string | null;
	} = $props();

	let selectedHistoryMatch = $state<MatchWithDetails | null>(null);
	let slipPreviewPath = $state<string | null>(null);

	const summary = $derived(buildSessionHistorySummary(session, players, payments, matches));
	const completedMatches = $derived(
		[...matches]
			.filter((match) => match.status === 'completed')
			.sort((a, b) => {
				const aMs = new Date(a.ended_at ?? a.created_at).getTime();
				const bMs = new Date(b.ended_at ?? b.created_at).getTime();
				return bMs - aMs;
			})
	);
	const attendedPlayers = $derived(players.filter((player) => isAttendedPlayer(player.status)));
	const otherPlayers = $derived(players.filter((player) => !isAttendedPlayer(player.status)));
	const cancellationFeePlayers = $derived(players.filter((player) => player.fee_owed > 0));

	const paymentForUser = (userId: string) =>
		payments.find((payment) => payment.user_id === userId) ?? null;

	const paymentBadgeClass = (status: PaymentStatus | null): string => {
		switch (status) {
			case 'approved':
				return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
			case 'submitted':
				return 'bg-sky-50 text-sky-700 ring-sky-100';
			case 'pending':
				return 'bg-amber-50 text-amber-800 ring-amber-100';
			default:
				return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-500 ring-slate-200';
		}
	};

	const shuttleLabel = $derived(
		session.shuttle
			? `${session.shuttle.name} · ${formatClubThb(session.shuttle_price_per_each)} each`
			: '—'
	);

	const cancelDetail = $derived(
		sessionCancelDetail({
			status: session.status,
			cancel_source: session.cancel_source,
			cancel_reason: session.cancel_reason,
			cancelled_by_name: session.cancelled_by_profile?.display_name ?? null
		})
	);
</script>

<section class="space-y-6">
	<DashboardHero
		eyebrow={t('history.eyebrow')}
		title={session.name}
		subtitle="{session.club?.name ?? t('control.clubSessionFallback')} · {formatDateTime(session.start_at)}"
	>
		<div class="app-hero-status {sessionStatusHeroClass(session.status)}">
			<span class="app-hero-status-dot" aria-hidden="true"></span>
			<div class="min-w-0 flex-1">
				<p class="app-hero-status-label">{t('history.finalStatus')}</p>
				<p class="app-hero-status-value">{sessionStatusLabel(session.status)}</p>
				{#if cancelDetail}
					<p class="mt-2 text-sm leading-snug text-white/90">{cancelDetail}</p>
				{/if}
			</div>
		</div>
	</DashboardHero>

	<section class="overflow-hidden rounded-3xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 dark:from-slate-900 via-white to-violet-50 shadow-sm">
		<div class="border-b border-brand-100/80 bg-brand-500/10 px-4 py-4 sm:px-6">
			<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('history.summary')}</h2>
			<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
				{formatDateTime(session.start_at)} – {formatDateTime(session.end_at)} · {summary.durationLabel}
			</p>
		</div>
		<div class="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-6">
			<div class="app-history-stat">
				<p class="app-history-stat-label">{t('history.playersAttended')}</p>
				<p class="app-history-stat-value">{summary.attendedCount}</p>
				<p class="app-history-stat-hint">{summary.rosterCount} sign-ups</p>
			</div>
			<div class="app-history-stat">
				<p class="app-history-stat-label">{t('sessions.detail.duration')}</p>
				<p class="app-history-stat-value">{summary.durationLabel}</p>
				<p class="app-history-stat-hint">Scheduled · {session.court_count} court{session.court_count === 1 ? '' : 's'}</p>
			</div>
			<div class="app-history-stat">
				<p class="app-history-stat-label">{t('history.uptime')}</p>
				<p class="app-history-stat-value">{summary.uptimeLabel}</p>
				<p class="app-history-stat-hint">{t('history.startToClose')}</p>
			</div>
			{#if summary.overdueLabel}
				<div class="app-history-stat border-rose-200/80 bg-rose-50/50">
					<p class="app-history-stat-label">{t('history.overdue')}</p>
					<p class="app-history-stat-value">{summary.overdueLabel}</p>
					<p class="app-history-stat-hint">{t('history.pastScheduledEnd')}</p>
				</div>
			{/if}
			<div class="app-history-stat">
				<p class="app-history-stat-label">{t('history.matches')}</p>
				<p class="app-history-stat-value">{summary.matchCount}</p>
				<p class="app-history-stat-hint">{t('history.completedGames')}</p>
			</div>
			<div class="app-history-stat">
				<p class="app-history-stat-label">{t('history.shuttleUsage')}</p>
				<p class="app-history-stat-value">{summary.totalShuttleUsage}</p>
				<p class="app-history-stat-hint">
					{summary.totalShuttleUsage === 1 ? t('sessionForm.shuttle') : t('history.shuttles')} consumed
				</p>
			</div>
			<div class="app-history-stat">
				<p class="app-history-stat-label">{t('history.collected')}</p>
				<p class="app-history-stat-value app-history-stat-value--money">
					{formatThb(summary.totalCollected + summary.cancellationFeesCollected)}
				</p>
				<p class="app-history-stat-hint">
					Court {formatThb(summary.totalCollected)} · Cancel fees {formatThb(summary.cancellationFeesCollected)}
				</p>
			</div>
			<div class="app-history-stat">
				<p class="app-history-stat-label">
					Court fee per player · {courtFeePerPlayerModeLabel(session.fixed_court_fee_per_player)}
				</p>
				<p class="app-history-stat-value app-history-stat-value--money">
					{formatThb(summary.perPlayerCourtShare)}
				</p>
				<p class="app-history-stat-hint">
					{courtFeePerPlayerModeHint(
						session.fixed_court_fee_per_player,
						summary.attendedCount
					)}
				</p>
			</div>
			<div
				class="app-history-stat {summary.profit.totalProfit >= 0
					? 'border-emerald-200/80 bg-emerald-50/50'
					: 'border-rose-200/80 bg-rose-50/50'}"
			>
				<p class="app-history-stat-label">{t('history.sessionProfit')}</p>
				<p class="app-history-stat-value app-history-stat-value--money">
					{formatThb(summary.profit.totalProfit)}
				</p>
				<p class="app-history-stat-hint">
					Court {formatThb(summary.profit.courtProfit)} · Shuttle {formatThb(
						summary.profit.shuttleProfit
					)}
				</p>
			</div>
		</div>
	</section>

	<AppCard class="space-y-4">
		<div>
			<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('history.playersWhoAttended')}</h2>
			<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
				Confirmed or marked left when the session ended.
			</p>
		</div>
		{#if attendedPlayers.length === 0}
			<EmptyState message={t('history.noPlayersAttended')} />
		{:else}
			<ul class="divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
				{#each attendedPlayers as player (player.id)}
					{@const payment = paymentForUser(player.user_id)}
					<li class="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-3">
						<UserAvatar
							displayName={player.profile?.display_name ?? t('role.player')}
							avatarUrl={player.profile?.avatar_url ?? null}
							size="sm"
						/>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<p class="truncate font-medium text-slate-900 dark:text-slate-100">
									{player.profile?.display_name ?? t('common.unknown')}
								</p>
								{#if player.profile?.tag}
									<TagPill tag={player.profile.tag} />
								{/if}
							</div>
							<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
								{sessionPlayerStatusLabel(player.status)}
								{#if player.left_at}
									· left {formatDateTime(player.left_at)}
								{:else if player.decided_at}
									· confirmed {formatDateTime(player.decided_at)}
								{/if}
							</p>
						</div>
						<div class="shrink-0 text-right">
							{#if payment}
								<p class="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
									{formatThb(payment.total_amount)}
								</p>
								<span
									class="mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 {paymentBadgeClass(
										payment.status
									)}"
								>
									{paymentStatusLabel(payment.status)}
								</span>
							{:else}
								<span
									class="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-500 ring-1 ring-slate-200"
								>
									No bill
								</span>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</AppCard>

	{#if otherPlayers.length > 0}
		<AppCard class="space-y-4">
			<div>
				<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('history.otherRegistrations')}</h2>
				<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">{t('history.otherRegistrationsHint')}</p>
			</div>
			<ul class="divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
				{#each otherPlayers as player (player.id)}
					<li class="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-3">
						<UserAvatar
							displayName={player.profile?.display_name ?? t('role.player')}
							avatarUrl={player.profile?.avatar_url ?? null}
							size="sm"
						/>
						<div class="min-w-0 flex-1">
							<p class="truncate font-medium text-slate-900 dark:text-slate-100">
								{player.profile?.display_name ?? t('common.unknown')}
							</p>
							<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
								{sessionPlayerStatusLabel(player.status)} · joined {formatDateTime(player.joined_at)}
							</p>
						</div>
						{#if player.profile?.tag}
							<TagPill tag={player.profile.tag} />
						{/if}
					</li>
				{/each}
			</ul>
		</AppCard>
	{/if}

	{#if cancellationFeePlayers.length > 0}
		<AppCard class="space-y-4">
			<div>
				<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('sessions.detail.cancellationFees')}</h2>
				<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
					{summary.cancellationFeesPaidCount} paid · {summary.cancellationFeesOutstandingCount} outstanding ·
					{summary.cancellationFeesWaivedCount} waived
				</p>
			</div>
			{#if canManageFees && cancellationFees.length > 0}
				<SessionCancellationFees
					fees={cancellationFees}
					{sessionId}
					bind:feeActionLoading
				/>
			{:else}
				<ul class="divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
					{#each cancellationFeePlayers as player (player.id)}
						<li class="bg-white dark:bg-slate-900 px-4 py-3">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<p class="truncate font-medium text-slate-900 dark:text-slate-100">
										{player.profile?.display_name ?? t('control.unknownPlayer')}
									</p>
									<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
										{sessionPlayerStatusLabel(player.status)} · late cancel
									</p>
								</div>
								<div class="flex shrink-0 flex-col items-end gap-1">
									<p class="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
										{formatThb(player.fee_owed)}
									</p>
									<span
										class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 {isOutstandingCancellationFee(
											player.fee_owed,
											player.fee_status
										)
											? 'bg-amber-50 text-amber-800 ring-amber-100'
											: player.fee_status === 'paid'
												? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
												: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-500 ring-slate-200'}"
									>
										{cancellationFeeStatusLabel(player.fee_status)}
									</span>
								</div>
							</div>
							{#if player.fee_slip_path}
								<div class="mt-2.5">
									<SlipPreviewButton
										onclick={() => (slipPreviewPath = player.fee_slip_path)}
									/>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
			<p class="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
				Cancellation fees collected {formatThb(summary.cancellationFeesCollected)}
			</p>
		</AppCard>
	{/if}

	<AppCard class="space-y-4">
		<div>
			<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('history.courtFeeBreakdown')}</h2>
			<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
				{summary.paymentsApprovedCount} paid · {summary.paymentsSubmittedCount} awaiting confirmation ·
				{summary.paymentsPendingCount} pending
			</p>
		</div>
		{#if payments.length === 0}
			<EmptyState message={t('history.noPayments')} />
		{:else}
			<ul class="divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
				{#each payments as payment (payment.id)}
					<li class="bg-white dark:bg-slate-900 px-4 py-3">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<p class="truncate font-medium text-slate-900 dark:text-slate-100">
									{payment.profile?.display_name ?? t('control.unknownPlayer')}
								</p>
								<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
									Court {formatThb(payment.court_share)}
									{#if payment.shuttle_share > 0}
										· Shuttle {formatThb(payment.shuttle_share)}
									{/if}
								</p>
							</div>
							<div class="flex shrink-0 flex-col items-end gap-1">
								<p class="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
									{formatThb(payment.total_amount)}
								</p>
								<span
									class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 {paymentBadgeClass(
										payment.status
									)}"
								>
									{paymentStatusLabel(payment.status)}
								</span>
							</div>
						</div>
						{#if payment.slip_path}
							<div class="mt-2.5">
								<SlipPreviewButton
									onclick={() => (slipPreviewPath = payment.slip_path)}
								/>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
			<p class="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
				Total billed {formatThb(summary.totalBilled)} · Collected {formatThb(summary.totalCollected)}
			</p>
		{/if}
	</AppCard>

	<AppCard class="space-y-4">
		<div>
			<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('history.matchHistory')}</h2>
			<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">{t('history.matchHistoryHint')}</p>
		</div>
		{#if completedMatches.length === 0}
			<EmptyState message={t('history.noMatches')} />
		{:else}
			<p class="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">
				{completedMatches.length} completed match{completedMatches.length === 1 ? '' : 'es'}
			</p>
			<ul class="space-y-2">
				{#each completedMatches as match (match.id)}
					<li>
						<MatchHistoryCard {match} onClick={() => (selectedHistoryMatch = match)} />
					</li>
				{/each}
			</ul>
		{/if}
	</AppCard>

	<section class="app-detail-section">
		<div class="border-b border-brand-100 bg-gradient-to-br from-brand-50 dark:from-slate-900 via-white to-brand-50/50 px-4 py-4 sm:px-6">
			<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('history.sessionConfig')}</h2>
			<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">{t('history.sessionConfigHint')}</p>
		</div>
		<div class="space-y-6 p-4 sm:p-6">
			{#if session.description}
				<div>
					<h3 class="app-section-heading">{t('clubs.create.descriptionLabel')}</h3>
					<div class="mt-2">
						<RichTextDisplay html={session.description} />
					</div>
				</div>
			{/if}

			<div>
				<h3 class="app-section-heading">{t('sessions.detail.overview')}</h3>
				<dl class="app-detail-contact-grid mt-3">
					<div class="app-detail-contact-item">
						<dt class="app-detail-contact-label">{t('workspace.club.shortLabel')}</dt>
						<dd class="app-detail-contact-value">{session.club?.name ?? '—'}</dd>
					</div>
					<div class="app-detail-contact-item">
						<dt class="app-detail-contact-label">{t('history.host')}</dt>
						<dd class="app-detail-contact-value">{session.host?.display_name ?? '—'}</dd>
					</div>
					<div class="app-detail-contact-item">
						<dt class="app-detail-contact-label">{t('sessionForm.venue')}</dt>
						<dd class="app-detail-contact-value">{session.venue_name ?? '—'}</dd>
					</div>
					<div class="app-detail-contact-item">
						<dt class="app-detail-contact-label">{t('dashboard.super.statusLabel')}</dt>
						<dd class="app-detail-contact-value">
							<span
								class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold {sessionStatusBadgeClass(
									session.status
								)}"
							>
								{sessionStatusLabel(session.status)}
							</span>
						</dd>
					</div>
				</dl>
			</div>

			<div>
				<h3 class="app-section-heading">{t('sessions.detail.capacityPricing')}</h3>
				<dl class="app-detail-meta-grid mt-3">
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">{t('sessions.detail.players')}</dt>
						<dd class="app-detail-meta-value">
							{session.min_players} – {session.max_players}
						</dd>
					</div>
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">{t('sessions.detail.courts')}</dt>
						<dd class="app-detail-meta-value">{session.court_count}</dd>
					</div>
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">{t('sessions.detail.courtFeeHour')}</dt>
						<dd class="app-detail-meta-value">{formatClubThb(session.court_fee_per_hour)}</dd>
					</div>
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">{t('sessions.detail.fixedCourtFee')}</dt>
						<dd class="app-detail-meta-value">
							{session.fixed_court_fee_per_player !== null
								? formatClubThb(session.fixed_court_fee_per_player)
								: t('common.splitEvenly')}
						</dd>
					</div>
					<div class="app-detail-meta-item sm:col-span-2">
						<dt class="app-detail-meta-label">{t('sessionForm.shuttle')}</dt>
						<dd class="app-detail-meta-value">{shuttleLabel}</dd>
					</div>
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">{t('sessionForm.matchSettings')}</dt>
						<dd class="app-detail-meta-value">
							{session.match_score_type} pts · {matchTypeLabel(session.match_type)}
						</dd>
					</div>
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">{t('sessions.detail.lateCancelFee')}</dt>
						<dd class="app-detail-meta-value">{formatClubThb(session.cancellation_fee)}</dd>
					</div>
				</dl>
			</div>
		</div>
	</section>
</section>

<MatchSummaryModal
	open={selectedHistoryMatch !== null}
	match={selectedHistoryMatch}
	onClose={() => (selectedHistoryMatch = null)}
/>

<SlipPreviewModal
	open={slipPreviewPath !== null}
	imageUrl={slipPreviewPath ? slipPreviewUrl(slipPreviewPath) : ''}
	onClose={() => (slipPreviewPath = null)}
/>
