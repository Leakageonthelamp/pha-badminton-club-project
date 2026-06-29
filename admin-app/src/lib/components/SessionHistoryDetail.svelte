<script lang="ts">
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import MatchHistoryCard from '@repo/ui/components/MatchHistoryCard.svelte';
	import MatchSummaryModal from '@repo/ui/components/MatchSummaryModal.svelte';
	import RichTextDisplay from '@repo/ui/components/RichTextDisplay.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import { formatDateTime } from '@repo/ui/datetime';
	import { formatThb, paymentStatusLabel, cancellationFeeStatusLabel } from '@repo/ui/payments';
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
				return 'bg-slate-100 text-slate-600 ring-slate-200';
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
		eyebrow="Session archive"
		title={session.name}
		subtitle="{session.club?.name ?? 'Club session'} · {formatDateTime(session.start_at)}"
	>
		<div class="app-hero-status {sessionStatusHeroClass(session.status)}">
			<span class="app-hero-status-dot" aria-hidden="true"></span>
			<div class="min-w-0 flex-1">
				<p class="app-hero-status-label">Final status</p>
				<p class="app-hero-status-value">{sessionStatusLabel(session.status)}</p>
				{#if cancelDetail}
					<p class="mt-2 text-sm leading-snug text-white/90">{cancelDetail}</p>
				{/if}
			</div>
		</div>
	</DashboardHero>

	<section class="overflow-hidden rounded-3xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 via-white to-violet-50 shadow-sm">
		<div class="border-b border-brand-100/80 bg-brand-500/10 px-4 py-4 sm:px-6">
			<h2 class="text-lg font-semibold text-slate-900">Session summary</h2>
			<p class="mt-1 text-sm text-slate-600">
				{formatDateTime(session.start_at)} – {formatDateTime(session.end_at)} · {summary.durationLabel}
			</p>
		</div>
		<div class="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-6">
			<div class="app-history-stat">
				<p class="app-history-stat-label">Players attended</p>
				<p class="app-history-stat-value">{summary.attendedCount}</p>
				<p class="app-history-stat-hint">{summary.rosterCount} sign-ups</p>
			</div>
			<div class="app-history-stat">
				<p class="app-history-stat-label">Duration</p>
				<p class="app-history-stat-value">{summary.durationLabel}</p>
				<p class="app-history-stat-hint">Scheduled · {session.court_count} court{session.court_count === 1 ? '' : 's'}</p>
			</div>
			<div class="app-history-stat">
				<p class="app-history-stat-label">Up-time</p>
				<p class="app-history-stat-value">{summary.uptimeLabel}</p>
				<p class="app-history-stat-hint">Start to close</p>
			</div>
			{#if summary.overdueLabel}
				<div class="app-history-stat border-rose-200/80 bg-rose-50/50">
					<p class="app-history-stat-label">Overdue</p>
					<p class="app-history-stat-value">{summary.overdueLabel}</p>
					<p class="app-history-stat-hint">Past scheduled end</p>
				</div>
			{/if}
			<div class="app-history-stat">
				<p class="app-history-stat-label">Matches</p>
				<p class="app-history-stat-value">{summary.matchCount}</p>
				<p class="app-history-stat-hint">Completed games</p>
			</div>
			<div class="app-history-stat">
				<p class="app-history-stat-label">Shuttle usage</p>
				<p class="app-history-stat-value">{summary.totalShuttleUsage}</p>
				<p class="app-history-stat-hint">
					{summary.totalShuttleUsage === 1 ? 'Shuttle' : 'Shuttles'} consumed
				</p>
			</div>
			<div class="app-history-stat">
				<p class="app-history-stat-label">Collected</p>
				<p class="app-history-stat-value app-history-stat-value--money">
					{formatThb(summary.totalCollected + summary.cancellationFeesCollected)}
				</p>
				<p class="app-history-stat-hint">
					Court {formatThb(summary.totalCollected)} · Cancel fees {formatThb(summary.cancellationFeesCollected)}
				</p>
			</div>
			<div class="app-history-stat">
				<p class="app-history-stat-label">Court share</p>
				<p class="app-history-stat-value app-history-stat-value--money">
					{formatThb(summary.perPlayerCourtShare)}
				</p>
				<p class="app-history-stat-hint">Per attended player</p>
			</div>
		</div>
	</section>

	<AppCard class="space-y-4">
		<div>
			<h2 class="text-lg font-semibold text-slate-900">Players who attended</h2>
			<p class="mt-1 text-sm text-slate-600">
				Confirmed or marked left when the session ended.
			</p>
		</div>
		{#if attendedPlayers.length === 0}
			<EmptyState message="No players attended this session." />
		{:else}
			<ul class="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
				{#each attendedPlayers as player (player.id)}
					{@const payment = paymentForUser(player.user_id)}
					<li class="flex items-center gap-3 bg-white px-4 py-3">
						<UserAvatar
							displayName={player.profile?.display_name ?? 'Player'}
							avatarUrl={player.profile?.avatar_url ?? null}
							size="sm"
						/>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<p class="truncate font-medium text-slate-900">
									{player.profile?.display_name ?? 'Unknown'}
								</p>
								{#if player.profile?.tag}
									<TagPill tag={player.profile.tag} />
								{/if}
							</div>
							<p class="text-xs text-slate-500">
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
								<p class="text-sm font-semibold tabular-nums text-slate-900">
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
									class="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
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
				<h2 class="text-lg font-semibold text-slate-900">Other registrations</h2>
				<p class="mt-1 text-sm text-slate-600">Waiting, queued, cancelled, or rejected — did not play.</p>
			</div>
			<ul class="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
				{#each otherPlayers as player (player.id)}
					<li class="flex items-center gap-3 bg-white px-4 py-3">
						<UserAvatar
							displayName={player.profile?.display_name ?? 'Player'}
							avatarUrl={player.profile?.avatar_url ?? null}
							size="sm"
						/>
						<div class="min-w-0 flex-1">
							<p class="truncate font-medium text-slate-900">
								{player.profile?.display_name ?? 'Unknown'}
							</p>
							<p class="text-xs text-slate-500">
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
				<h2 class="text-lg font-semibold text-slate-900">Cancellation fees</h2>
				<p class="mt-1 text-sm text-slate-600">
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
				<ul class="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
					{#each cancellationFeePlayers as player (player.id)}
						<li class="flex items-center justify-between gap-3 bg-white px-4 py-3">
							<div class="min-w-0 flex-1">
								<p class="truncate font-medium text-slate-900">
									{player.profile?.display_name ?? 'Unknown player'}
								</p>
								<p class="text-xs text-slate-500">
									{sessionPlayerStatusLabel(player.status)} · late cancel
								</p>
							</div>
							<div class="flex shrink-0 flex-col items-end gap-1">
								<p class="text-sm font-semibold tabular-nums text-slate-900">
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
											: 'bg-slate-100 text-slate-600 ring-slate-200'}"
								>
									{cancellationFeeStatusLabel(player.fee_status)}
								</span>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
			<p class="text-sm text-slate-600">
				Cancellation fees collected {formatThb(summary.cancellationFeesCollected)}
			</p>
		</AppCard>
	{/if}

	<AppCard class="space-y-4">
		<div>
			<h2 class="text-lg font-semibold text-slate-900">Court fee breakdown</h2>
			<p class="mt-1 text-sm text-slate-600">
				{summary.paymentsApprovedCount} paid · {summary.paymentsSubmittedCount} awaiting confirmation ·
				{summary.paymentsPendingCount} pending
			</p>
		</div>
		{#if payments.length === 0}
			<EmptyState message="No payment records for this session." />
		{:else}
			<ul class="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
				{#each payments as payment (payment.id)}
					<li class="flex items-center justify-between gap-3 bg-white px-4 py-3">
						<div class="min-w-0 flex-1">
							<p class="truncate font-medium text-slate-900">
								{payment.profile?.display_name ?? 'Unknown player'}
							</p>
							<p class="text-xs text-slate-500">
								Court {formatThb(payment.court_share)}
								{#if payment.shuttle_share > 0}
									· Shuttle {formatThb(payment.shuttle_share)}
								{/if}
							</p>
						</div>
						<div class="flex shrink-0 flex-col items-end gap-1">
							<p class="text-sm font-semibold tabular-nums text-slate-900">
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
					</li>
				{/each}
			</ul>
			<p class="text-sm text-slate-600">
				Total billed {formatThb(summary.totalBilled)} · Collected {formatThb(summary.totalCollected)}
			</p>
		{/if}
	</AppCard>

	<AppCard class="space-y-4">
		<div>
			<h2 class="text-lg font-semibold text-slate-900">Match history</h2>
			<p class="mt-1 text-sm text-slate-600">Games played, scores, and court assignments.</p>
		</div>
		{#if completedMatches.length === 0}
			<EmptyState message="No matches were recorded for this session." />
		{:else}
			<p class="text-xs font-medium text-slate-500">
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
		<div class="border-b border-brand-100 bg-gradient-to-br from-brand-50 via-white to-brand-50/50 px-4 py-4 sm:px-6">
			<h2 class="text-lg font-semibold text-slate-900">Session configuration</h2>
			<p class="mt-1 text-sm text-slate-600">Read-only snapshot of how this session was set up.</p>
		</div>
		<div class="space-y-6 p-4 sm:p-6">
			{#if session.description}
				<div>
					<h3 class="app-section-heading">Description</h3>
					<div class="mt-2">
						<RichTextDisplay html={session.description} />
					</div>
				</div>
			{/if}

			<div>
				<h3 class="app-section-heading">Overview</h3>
				<dl class="app-detail-contact-grid mt-3">
					<div class="app-detail-contact-item">
						<dt class="app-detail-contact-label">Club</dt>
						<dd class="app-detail-contact-value">{session.club?.name ?? '—'}</dd>
					</div>
					<div class="app-detail-contact-item">
						<dt class="app-detail-contact-label">Host</dt>
						<dd class="app-detail-contact-value">{session.host?.display_name ?? '—'}</dd>
					</div>
					<div class="app-detail-contact-item">
						<dt class="app-detail-contact-label">Venue</dt>
						<dd class="app-detail-contact-value">{session.venue_name ?? '—'}</dd>
					</div>
					<div class="app-detail-contact-item">
						<dt class="app-detail-contact-label">Status</dt>
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
				<h3 class="app-section-heading">Capacity & pricing</h3>
				<dl class="app-detail-meta-grid mt-3">
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">Players</dt>
						<dd class="app-detail-meta-value">
							{session.min_players} – {session.max_players}
						</dd>
					</div>
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">Courts</dt>
						<dd class="app-detail-meta-value">{session.court_count}</dd>
					</div>
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">Court fee / hour</dt>
						<dd class="app-detail-meta-value">{formatClubThb(session.court_fee_per_hour)}</dd>
					</div>
					<div class="app-detail-meta-item sm:col-span-2">
						<dt class="app-detail-meta-label">Shuttle</dt>
						<dd class="app-detail-meta-value">{shuttleLabel}</dd>
					</div>
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">Match settings</dt>
						<dd class="app-detail-meta-value">
							{session.match_score_type} pts · {matchTypeLabel(session.match_type)}
						</dd>
					</div>
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">Late cancel fee</dt>
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
