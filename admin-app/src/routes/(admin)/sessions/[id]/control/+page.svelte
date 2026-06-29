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
	import SessionLiveTimers from '@repo/ui/components/SessionLiveTimers.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import LayersIcon from '@repo/ui/icons/LayersIcon.svelte';
	import ChevronDownIcon from '@repo/ui/icons/ChevronDownIcon.svelte';
	import MatchSummaryModal from '@repo/ui/components/MatchSummaryModal.svelte';
	import MatchHistoryCard from '@repo/ui/components/MatchHistoryCard.svelte';
	import PlayerMatchHistoryCard from '@repo/ui/components/PlayerMatchHistoryCard.svelte';
	import { formatDateTime, formatUptime } from '@repo/ui/datetime';
	import { subscribePostgresChangesWithPollFallback } from '@repo/ui/realtimeSubscribe';
	import { formatThb, computeCourtTotal, paymentStatusLabel } from '@repo/ui/payments';
	import type { PaymentStatus } from '@repo/ui/payments';
	import {
		clampIdleSince,
		derivePlayerLiveStatus,
		idleSinceSortKey,
		type PlayerLiveStatus
	} from '@repo/ui/sessionStatus';
	import { createSupabaseBrowserClient } from '$lib/supabase/client';
	import { sessionStatusBadgeClass, sessionStatusLabel } from '$lib/types/session';
	import type { SessionPlayerWithProfile } from '$lib/types/session';
	import SessionCancellationFees from '$lib/components/SessionCancellationFees.svelte';
	import MatchmakingModal from '$lib/components/MatchmakingModal.svelte';
	import type { CourtGridMatch, MatchWithDetails } from '$lib/types/match';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let nowMs = $state(Date.now());
	let settlementModalOpen = $state(false);
	let closeModalOpen = $state(false);
	let endEarlyModalOpen = $state(false);
	let actionLoading = $state<string | null>(null);
	let feeActionLoading = $state<string | null>(null);
	let matchmakingOpen = $state(false);
	let matchmakingCourt = $state<number | null>(null);
	let matchmakingLoading = $state(false);
	let courtLoadingNumber = $state<number | null>(null);
	let courtDetailOpen = $state(false);
	let selectedCourtMatch = $state<CourtGridMatch | null>(null);
	let selectedHistoryMatch = $state<MatchWithDetails | null>(null);
	let expandedPlayerIds = $state<Set<string>>(new Set());
	let historyPage = $state(1);

	const MATCH_HISTORY_PAGE_SIZE = 5;

	const sortedCompletedMatches = $derived(
		[...data.completedMatches].sort((a, b) => {
			const aMs = new Date(a.ended_at ?? a.created_at).getTime();
			const bMs = new Date(b.ended_at ?? b.created_at).getTime();
			return bMs - aMs;
		})
	);
	const historyPageCount = $derived(
		Math.max(1, Math.ceil(sortedCompletedMatches.length / MATCH_HISTORY_PAGE_SIZE))
	);
	const paginatedCompletedMatches = $derived(
		sortedCompletedMatches.slice(
			(historyPage - 1) * MATCH_HISTORY_PAGE_SIZE,
			historyPage * MATCH_HISTORY_PAGE_SIZE
		)
	);

	$effect(() => {
		if (historyPage > historyPageCount) {
			historyPage = historyPageCount;
		}
	});

	const completedMatchesByUser = $derived.by(() => {
		const map = new Map<string, MatchWithDetails[]>();

		for (const match of data.matches) {
			if (match.status !== 'completed') continue;

			for (const player of match.players) {
				const list = map.get(player.user_id) ?? [];
				list.push(match);
				map.set(player.user_id, list);
			}
		}

		for (const [userId, matches] of map) {
			map.set(
				userId,
				[...matches].sort((a, b) => {
					const aMs = new Date(a.ended_at ?? a.created_at).getTime();
					const bMs = new Date(b.ended_at ?? b.created_at).getTime();
					return bMs - aMs;
				})
			);
		}

		return map;
	});

	const matchCountForPlayer = (userId: string) => completedMatchesByUser.get(userId)?.length ?? 0;

	function togglePlayerMatchHistory(playerId: string) {
		const next = new Set(expandedPlayerIds);
		if (next.has(playerId)) next.delete(playerId);
		else next.add(playerId);
		expandedPlayerIds = next;
	}

	const session = $derived(data.session);
	const totalCourtFee = $derived(
		computeCourtTotal({
			courtFeePerHour: session.court_fee_per_hour,
			startAt: session.start_at,
			endAt: session.end_at,
			courtCount: session.court_count
		})
	);
	const shuttlesUsed = $derived(
		data.matches.reduce((sum, match) => sum + match.shuttles_used, 0)
	);
	const totalShuttleFee = $derived(shuttlesUsed * session.shuttle_price_per_each);
	const totalSessionCost = $derived(totalCourtFee + totalShuttleFee);
	const activePlayers = $derived(data.players.filter((player) => player.status === 'confirmed'));
	const checklistPlayers = $derived.by(() => {
		const confirmed = data.players.filter((player) => player.status === 'confirmed');
		const left = data.players.filter((player) => player.status === 'left');

		const sortedConfirmed = [...confirmed].sort(
			(a, b) =>
				idleSinceSortKey(a.idle_since, session.start_at) -
				idleSinceSortKey(b.idle_since, session.start_at)
		);

		return [...sortedConfirmed, ...left];
	});
	const idlePlayersForMatchmaking = $derived(
		checklistPlayers.filter(
			(player) =>
				player.status === 'confirmed' &&
				player.activity === 'idle' &&
				!data.matches.some(
					(match) =>
						match.status !== 'completed' &&
						match.status !== 'cancelled' &&
						match.players.some((entry) => entry.user_id === player.user_id)
				)
		)
	);
	const pendingLeaveRequests = $derived(
		data.leaveRequests.filter((request) => request.status === 'pending')
	);
	const toastMessage = $derived(form?.message ?? null);
	const toastVariant = $derived(form?.success ? 'success' : 'error');

	const paymentForPlayer = (userId: string) =>
		data.payments.find((payment) => payment.user_id === userId) ?? null;

	const endedOrReached = $derived(data.endReached || session.ended_early);

	const canCloseSession = $derived(
		endedOrReached &&
			data.settlementStarted &&
			data.allPaymentsApproved &&
			data.allCancellationFeesResolved
	);

	const paymentsApprovedCount = $derived(
		checklistPlayers.filter((player) => paymentForPlayer(player.user_id)?.status === 'approved')
			.length
	);

	const billedPlayerCount = $derived(checklistPlayers.length);

	const paymentsAwaitingConfirm = $derived(
		data.payments.filter((payment) => payment.status === 'submitted').length
	);

	const needsAttention = $derived(
		pendingLeaveRequests.length > 0 || paymentsAwaitingConfirm > 0
	);

	const paymentProgress = $derived(
		billedPlayerCount === 0
			? 100
			: Math.round((paymentsApprovedCount / billedPlayerCount) * 100)
	);

	const timeUntilEndLabel = $derived.by(() => {
		if (session.ended_early) return 'Ended early';

		const diff = new Date(session.end_at).getTime() - nowMs;
		if (diff <= 0) return 'Session ended';
		const totalMinutes = Math.ceil(diff / 60_000);
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;
		if (hours === 0) return `${minutes} min left`;
		if (minutes === 0) return `${hours} hr left`;
		return `${hours} hr ${minutes} min left`;
	});

	const workflowStep = $derived(
		!data.settlementStarted ? 1 : !data.allPaymentsApproved ? 2 : endedOrReached ? 3 : 2
	);

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

	const paymentRowHint = (status: PaymentStatus | null): string => {
		switch (status) {
			case 'approved':
				return 'Paid and confirmed';
			case 'submitted':
				return 'Player marked paid — confirm transfer';
			case 'pending':
				return 'Waiting for player to pay';
			default:
				return 'Bill created at settlement';
		}
	};

	const playerIdleLabel = (idleSince: string | null): string | null => {
		const clamped = clampIdleSince(idleSince, session.start_at);
		if (!clamped) return null;

		return formatUptime(clamped, nowMs);
	};

	const rosterSectionMeta = $derived.by(() => {
		if (data.settlementStarted) {
			return `${paymentsApprovedCount} of ${billedPlayerCount} players confirmed paid · sorted by longest idle first`;
		}

		if (data.endReached) {
			return 'Sorted by longest idle first · scheduled end reached — start settlement to bill players';
		}

		if (session.ended_early) {
			return 'Sorted by longest idle first · session ended early — confirm each payment below';
		}

		return `Sorted by longest idle first · settlement opens at ${formatDateTime(session.end_at)}`;
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
		const sessionId = session.id;

		return subscribePostgresChangesWithPollFallback(
			supabase,
			`admin-session-control-${sessionId}`,
			[
				{ table: 'session_players', filter: `session_id=eq.${sessionId}` },
				{ table: 'payments', filter: `session_id=eq.${sessionId}` },
				{ table: 'session_leave_requests', filter: `session_id=eq.${sessionId}` },
				{ event: 'UPDATE', table: 'sessions', filter: `id=eq.${sessionId}` },
				{ table: 'matches', filter: `session_id=eq.${sessionId}` },
				{ table: 'match_players', filter: `session_id=eq.${sessionId}` }
			],
			() => void invalidate('app:session-control')
		);
	});

	const handleAction =
		(key: string): SubmitFunction =>
		() => {
			actionLoading = key;
			return async ({ result, update }) => {
				await update({ reset: false });
				actionLoading = null;
				if (result.type === 'success') {
					settlementModalOpen = false;
					closeModalOpen = false;
					endEarlyModalOpen = false;
					matchmakingOpen = false;
				}
			};
		};

	const handleCourtClick = (courtNumber: number) => {
		if (courtLoadingNumber !== null) return;

		const liveMatch = data.courtGridMatches.find((entry) => entry.courtNumber === courtNumber);
		if (liveMatch?.matchId) {
			selectedCourtMatch = liveMatch;
			courtDetailOpen = true;
			return;
		}

		if (endedOrReached) return;

		matchmakingCourt = courtNumber;
		matchmakingOpen = true;
	};

	const openSelectedCourtMatchControl = () => {
		if (!selectedCourtMatch?.matchId || courtLoadingNumber !== null) return;

		const courtNumber = selectedCourtMatch.courtNumber;
		const matchId = selectedCourtMatch.matchId;
		courtDetailOpen = false;
		courtLoadingNumber = courtNumber;
		void goto(`/sessions/${session.id}/control/match/${matchId}`).finally(() => {
			courtLoadingNumber = null;
		});
	};

	const submitMatchmaking = async (userIds: string[]) => {
		if (!matchmakingCourt) return;

		const courtNumber = matchmakingCourt;
		matchmakingLoading = true;
		courtLoadingNumber = courtNumber;
		const formData = new FormData();
		formData.set('court_number', String(courtNumber));
		for (const userId of userIds) {
			formData.append('user_ids', userId);
		}

		try {
			const response = await fetch('?/createMatch', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				matchmakingOpen = false;
				matchmakingCourt = null;
				await invalidate('app:session-control');
			}
		} finally {
			matchmakingLoading = false;
			courtLoadingNumber = null;
		}
	};
</script>

{#snippet playerMatchHistoryPanel(player: SessionPlayerWithProfile)}
	{#if expandedPlayerIds.has(player.id)}
		<div
			id="player-match-history-{player.id}"
			class="border-t border-slate-100 px-4 pb-3 pt-3"
		>
			<ul class="space-y-1.5">
				{#each completedMatchesByUser.get(player.user_id) ?? [] as match, index (match.id)}
					{@const matchNumber =
						(completedMatchesByUser.get(player.user_id)?.length ?? 0) - index}
					<li>
						<PlayerMatchHistoryCard
							{match}
							userId={player.user_id}
							{matchNumber}
							compact
							onClick={() => (selectedHistoryMatch = match)}
						/>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
{/snippet}

{#snippet playerRosterToggleRow(
	player: SessionPlayerWithProfile,
	liveStatus: PlayerLiveStatus,
	idleLabel: string | null,
	meta: import('svelte').Snippet
)}
	{@const matchCount = matchCountForPlayer(player.user_id)}
	{@const expanded = expandedPlayerIds.has(player.id)}
	{@const expandable = matchCount > 0}
	{@const displayName = player.profile?.display_name ?? 'Unknown player'}
	{#if expandable}
		<button
			type="button"
			class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/80"
			aria-expanded={expanded}
			aria-controls="player-match-history-{player.id}"
			aria-label="{displayName} — {matchCount} match{matchCount === 1 ? '' : 'es'}, {expanded
				? 'collapse'
				: 'expand'} history"
			onclick={() => togglePlayerMatchHistory(player.id)}
		>
			<UserAvatar
				displayName={player.profile?.display_name ?? 'Player'}
				avatarUrl={player.profile?.avatar_url ?? null}
				size="sm"
			/>
			<div class="min-w-0 flex-1">
				{@render playerRosterIdentity(player, liveStatus)}
				{@render meta()}
			</div>
			<div class="flex shrink-0 items-center gap-2 self-center">
				{#if idleLabel && liveStatus === 'idle'}
					<div class="text-right">
						<p
							class="font-mono text-xl font-bold tabular-nums leading-none text-brand-800"
							aria-live="polite"
						>
							{idleLabel}
						</p>
						<p class="mt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
							Idle time
						</p>
					</div>
				{/if}
				<ChevronDownIcon
					class="h-5 w-5 shrink-0 text-slate-400 transition {expanded ? 'rotate-180' : ''}"
				/>
			</div>
		</button>
	{:else}
		<div class="flex items-start gap-3 px-4 py-3">
			<UserAvatar
				displayName={player.profile?.display_name ?? 'Player'}
				avatarUrl={player.profile?.avatar_url ?? null}
				size="sm"
			/>
			<div class="min-w-0 flex-1">
				{@render playerRosterIdentity(player, liveStatus)}
				{@render meta()}
			</div>
			{#if idleLabel && liveStatus === 'idle'}
				<div class="shrink-0 text-right">
					<p
						class="font-mono text-xl font-bold tabular-nums leading-none text-brand-800"
						aria-live="polite"
					>
						{idleLabel}
					</p>
					<p class="mt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
						Idle time
					</p>
				</div>
			{/if}
		</div>
	{/if}
{/snippet}

{#snippet playerRosterIdentity(player: SessionPlayerWithProfile, liveStatus: PlayerLiveStatus)}
	{@const displayName = player.profile?.display_name ?? 'Unknown player'}
	{@const matchCount = matchCountForPlayer(player.user_id)}
	<p class="truncate font-semibold text-slate-900">
		{displayName}
	</p>
	<div class="mt-1 flex flex-wrap items-center gap-2">
		{#if player.profile?.tag}
			<TagPill tag={player.profile.tag} />
		{/if}
		<PlayerStatusBadge status={liveStatus} />
		<span
			class="inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 bg-slate-100 text-slate-700 ring-slate-200"
		>
			{matchCount} match{matchCount === 1 ? '' : 'es'}
		</span>
	</div>
{/snippet}

<section class="space-y-6">
	<DashboardHero
		eyebrow="Live session control"
		title={session.name}
		subtitle={session.club?.name ?? 'Club session'}
	>
		<div class="flex flex-wrap items-center gap-2">
			<span
				class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold {sessionStatusBadgeClass(
					session.status
				)}"
			>
				<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-80"></span>
				{sessionStatusLabel(session.status)}
			</span>
			{#if endedOrReached}
				<span class="app-hero-stat app-hero-stat--warn">{timeUntilEndLabel}</span>
			{/if}
		</div>
	</DashboardHero>

	{#if session.status === 'in_progress'}
		<SessionLiveTimers
			startAt={session.start_at}
			endAt={session.end_at}
			showRemaining={!endedOrReached}
			showOverdue={endedOrReached}
			variant="banner"
		/>
	{/if}

	<FormToast message={toastMessage} variant={toastVariant} />

	<!-- Workflow -->
	<AppCard class="space-y-4">
		<div>
			<h2 class="app-section-title">How to wrap up</h2>
			<p class="app-section-meta">
				Manage live play first, then bill players at end time, then close when everyone has paid.
			</p>
		</div>

		<ol class="grid gap-3 sm:grid-cols-3">
			<li
				class="rounded-2xl border px-4 py-3 {workflowStep === 1
					? 'border-brand-300 bg-brand-50/80 ring-2 ring-brand-200'
					: workflowStep > 1
						? 'border-emerald-200 bg-emerald-50/50'
						: 'border-slate-200 bg-slate-50/80'}"
			>
				<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 1</p>
				<p class="mt-1 font-semibold text-slate-900">Live play</p>
				<p class="mt-1 text-sm text-slate-600">Roster, courts, early leave requests</p>
			</li>
			<li
				class="rounded-2xl border px-4 py-3 {workflowStep === 2
					? 'border-brand-300 bg-brand-50/80 ring-2 ring-brand-200'
					: workflowStep > 2
						? 'border-emerald-200 bg-emerald-50/50'
						: 'border-slate-200 bg-slate-50/80'}"
			>
				<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 2</p>
				<p class="mt-1 font-semibold text-slate-900">Settlement</p>
				<p class="mt-1 text-sm text-slate-600">
					{data.settlementStarted ? 'Confirm each PromptPay transfer' : 'Start after scheduled end'}
				</p>
			</li>
			<li
				class="rounded-2xl border px-4 py-3 {workflowStep === 3
					? 'border-brand-300 bg-brand-50/80 ring-2 ring-brand-200'
					: 'border-slate-200 bg-slate-50/80'}"
			>
				<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Step 3</p>
				<p class="mt-1 font-semibold text-slate-900">Close session</p>
				<p class="mt-1 text-sm text-slate-600">Mark everyone left and archive the session</p>
			</li>
		</ol>
	</AppCard>

	<!-- Quick stats (2 cols — admin shell is max-w-lg) -->
	<div class="grid grid-cols-2 gap-3">
		<div class="app-card-padded flex min-h-24 flex-col items-center justify-center gap-1 text-center">
			<p class="text-2xl font-bold tabular-nums text-brand-700">{data.activePlayerCount}</p>
			<p class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">Players</p>
		</div>
		<div class="app-card-padded flex min-h-24 flex-col items-center justify-center gap-1 text-center">
			<p class="text-2xl font-bold tabular-nums text-brand-700">{session.court_count}</p>
			<p class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">Courts</p>
		</div>
		<div class="app-card-padded flex min-h-24 flex-col items-center justify-center gap-1 text-center">
			<p class="text-xl font-bold tabular-nums leading-tight text-brand-700">
				{formatThb(data.perPlayerCost)}
			</p>
			<p class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
				Court fee per player
			</p>
		</div>
		<div class="app-card-padded flex min-h-24 flex-col items-center justify-center gap-1 text-center">
			<p class="text-xl font-bold tabular-nums leading-tight text-brand-700">
				{formatThb(totalCourtFee)}
			</p>
			<p class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
				Total court fee
			</p>
		</div>
		<div class="app-card-padded flex min-h-24 flex-col items-center justify-center gap-1 text-center">
			<p class="text-2xl font-bold tabular-nums text-brand-700">{shuttlesUsed}</p>
			<p class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
				Shuttles usage
			</p>
		</div>
		<div class="app-card-padded flex min-h-24 flex-col items-center justify-center gap-1 text-center">
			<p class="text-xl font-bold tabular-nums leading-tight text-brand-700">
				{formatThb(totalShuttleFee)}
			</p>
			<p class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
				Total shuttles fee
			</p>
		</div>
		<div class="app-card-padded flex min-h-24 flex-col items-center justify-center gap-1 text-center">
			<p class="text-2xl font-bold tabular-nums text-brand-700">
				{paymentsApprovedCount}/{data.activePlayerCount || '—'}
			</p>
			<p class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">Paid</p>
		</div>
		<div class="app-card-padded flex min-h-24 flex-col items-center justify-center gap-1 text-center">
			<p class="text-xl font-bold tabular-nums leading-tight text-brand-700">
				{formatThb(totalSessionCost)}
			</p>
			<p class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
				Total session cost
			</p>
		</div>
	</div>

	{#if needsAttention}
		<AppCard class="space-y-2 border-amber-200 bg-amber-50/70">
			<h2 class="text-base font-semibold text-amber-900">Needs your attention</h2>
			<ul class="space-y-1 text-sm text-amber-900">
				{#if paymentsAwaitingConfirm > 0}
					<li>
						{paymentsAwaitingConfirm} payment{paymentsAwaitingConfirm === 1 ? '' : 's'} waiting for
						your confirmation
					</li>
				{/if}
				{#if pendingLeaveRequests.length > 0}
					<li>
						{pendingLeaveRequests.length} early leave request{pendingLeaveRequests.length === 1
							? ''
							: 's'} — approve payment first, then leave
					</li>
				{/if}
			</ul>
		</AppCard>
	{/if}

	<!-- Leave requests (priority when present) -->
	{#if pendingLeaveRequests.length > 0}
		<AppCard class="space-y-4 border-amber-200/80">
			<div class="app-section-header">
				<div>
					<h2 class="app-section-title">Early leave requests</h2>
					<p class="app-section-meta">
						Confirm the player's PromptPay transfer before approving their leave.
					</p>
				</div>
				<span
					class="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-amber-100 px-2 text-sm font-bold text-amber-800"
				>
					{pendingLeaveRequests.length}
				</span>
			</div>

			<ul class="space-y-3">
				{#each pendingLeaveRequests as request (request.id)}
					{@const payment = paymentForPlayer(request.user_id)}
					<li class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="flex min-w-0 items-center gap-3">
								<UserAvatar
									displayName={request.profile?.display_name ?? 'Player'}
									avatarUrl={request.profile?.avatar_url ?? null}
									size="md"
								/>
								<div>
									<p class="font-semibold text-slate-900">
										{request.profile?.display_name ?? 'Unknown player'}
									</p>
									<p class="text-xs text-slate-500">
										Requested {formatDateTime(request.requested_at)}
									</p>
									{#if request.profile?.tag}
										<div class="mt-1">
											<TagPill tag={request.profile.tag} />
										</div>
									{/if}
								</div>
							</div>

							<span
								class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 {paymentBadgeClass(
									payment?.status ?? null
								)}"
							>
								{payment
									? paymentStatusLabel(payment.status)
									: `Owes ${formatThb(data.perPlayerCost)}`}
							</span>
						</div>

						{#if !payment || payment.status !== 'approved'}
							<p class="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
								Approve their payment in the roster below before you can approve leave.
							</p>
						{/if}

						<div class="mt-3 flex flex-wrap gap-2">
							<form method="POST" action="?/approveLeave" use:enhance={handleAction(`leave-${request.id}`)}>
								<input type="hidden" name="request_id" value={request.id} />
								<SubmitButton
									loading={actionLoading === `leave-${request.id}`}
									disabled={!payment || payment.status !== 'approved'}
									class="!w-auto !px-4 !py-2 !text-sm"
									loadingLabel="…"
								>
									Approve leave
								</SubmitButton>
							</form>
							<form method="POST" action="?/rejectLeave" use:enhance={handleAction(`reject-${request.id}`)}>
								<input type="hidden" name="request_id" value={request.id} />
								<SubmitButton
									variant="secondary"
									loading={actionLoading === `reject-${request.id}`}
									class="!w-auto !px-4 !py-2 !text-sm"
									loadingLabel="…"
								>
									Reject
								</SubmitButton>
							</form>
						</div>
					</li>
				{/each}
			</ul>
		</AppCard>
	{/if}

	<!-- Active players, status & payments -->
	<AppCard class="space-y-4">
		<div class="app-section-header">
			<div>
				<h2 class="app-section-title">Active players & payments</h2>
				<p class="app-section-meta">{rosterSectionMeta}</p>
			</div>
		</div>

		{#if data.settlementStarted && billedPlayerCount > 0}
			<div>
				<div class="mb-1 flex justify-between text-xs font-medium text-slate-600">
					<span>Progress</span>
					<span>{paymentProgress}%</span>
				</div>
				<div class="h-2 overflow-hidden rounded-full bg-slate-100">
					<div
						class="h-full rounded-full bg-brand-600 transition-all duration-300"
						style="width: {paymentProgress}%"
					></div>
				</div>
			</div>
		{/if}

		{#if checklistPlayers.length === 0}
			<EmptyState message="No active players in this session." />
		{:else if !data.settlementStarted}
			<div class="app-muted-panel">
				Live player status and idle time below — assign matches to those idle longest first.
				Payments appear after you tap <strong>Start settlement</strong> at session end. Early leavers
				get a bill as soon as they request to leave.
			</div>
			<ul class="space-y-3">
				{#each checklistPlayers as player (player.id)}
					{@const liveStatus = derivePlayerLiveStatus({
						membershipStatus: player.status,
						activity: player.activity
					})}
					{@const idleLabel = playerIdleLabel(player.idle_since)}
					<li class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
						{#snippet statusMeta()}
							{#if liveStatus === 'break'}
								<p class="mt-1 text-xs text-amber-700">On break — not available for assignment</p>
							{:else if liveStatus === 'billing'}
								<p class="mt-1 text-xs text-sky-700">Waiting for payment confirmation</p>
							{:else if liveStatus === 'leave'}
								<p class="mt-1 text-xs text-slate-500">Left the session</p>
							{/if}
						{/snippet}
						{@render playerRosterToggleRow(player, liveStatus, idleLabel, statusMeta)}
						{@render playerMatchHistoryPanel(player)}
					</li>
				{/each}
			</ul>
		{:else}
			<ul class="space-y-3">
				{#each checklistPlayers as player (player.id)}
					{@const payment = paymentForPlayer(player.user_id)}
					{@const status = payment?.status ?? null}
					{@const liveStatus = derivePlayerLiveStatus({
						membershipStatus: player.status,
						activity: player.activity
					})}
					{@const idleLabel = playerIdleLabel(player.idle_since)}
					<li
						class="overflow-hidden rounded-2xl border {status === 'submitted'
							? 'border-sky-200 bg-sky-50/40'
							: status === 'approved'
								? 'border-emerald-200 bg-emerald-50/30'
								: 'border-slate-200 bg-white'}"
					>
						{#snippet settlementMeta()}
							<p class="mt-1 text-xs text-slate-500">{paymentRowHint(status)}</p>
						{/snippet}
						{@render playerRosterToggleRow(player, liveStatus, idleLabel, settlementMeta)}

						<div
							class="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100/80 px-4 py-3"
						>
							<span class="text-sm font-semibold text-slate-800">
								{payment ? formatThb(payment.total_amount) : formatThb(data.perPlayerCost)}
							</span>
							<span
								class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 {paymentBadgeClass(
									status
								)}"
							>
								{payment ? paymentStatusLabel(payment.status) : 'Not billed'}
							</span>
							{#if payment && payment.status !== 'approved'}
								<form
									method="POST"
									action="?/approvePayment"
									use:enhance={handleAction(`pay-${payment.id}`)}
								>
									<input type="hidden" name="payment_id" value={payment.id} />
									<SubmitButton
										loading={actionLoading === `pay-${payment.id}`}
										loadingLabel="…"
										class="!w-auto !px-3 !py-1.5 !text-xs"
									>
										Confirm paid
									</SubmitButton>
								</form>
							{/if}
						</div>
						{@render playerMatchHistoryPanel(player)}
					</li>
				{/each}
			</ul>
		{/if}
	</AppCard>

	{#if data.cancellationFees.length > 0}
		<AppCard class="space-y-4">
			<div class="app-section-header">
				<div>
					<h2 class="app-section-title">Cancellation fees</h2>
					<p class="app-section-meta">
						Resolve all late cancellation fees before closing the session.
					</p>
				</div>
			</div>
			<SessionCancellationFees
				fees={data.cancellationFees}
				sessionId={session.id}
				bind:feeActionLoading
			/>
		</AppCard>
	{/if}

	<!-- Courts & matches -->
	<section class="app-detail-section">
		<div class="app-detail-section-body space-y-4">
			<div class="app-detail-section-header">
				<span class="app-detail-section-icon" aria-hidden="true">
					<LayersIcon class="h-5 w-5" />
				</span>
				<div>
					<h2 class="text-lg font-semibold text-slate-900">Courts & matches</h2>
					<p class="text-sm text-slate-500">
						Tap a court to view details or assign a match on idle courts.
					</p>
				</div>
			</div>
			{#if endedOrReached}
				<div class="rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2.5 text-sm text-rose-900">
					<strong>Session ended.</strong> Matches already in progress can finish, but no new matches
					can be assigned. Start settlement when ready.
				</div>
			{/if}
			<CourtGrid
				courtCount={session.court_count}
				matches={data.courtGridMatches}
				loadingCourtNumber={courtLoadingNumber}
				onCourtClick={handleCourtClick}
			/>
			{#if sortedCompletedMatches.length === 0}
				<EmptyState message="No matches recorded yet." />
			{:else}
				<div class="space-y-3">
					<p class="text-xs font-medium text-slate-500">
						{sortedCompletedMatches.length} completed match{sortedCompletedMatches.length === 1
							? ''
							: 'es'}
					</p>
					<ul class="space-y-2">
						{#each paginatedCompletedMatches as match (match.id)}
							<li>
								<MatchHistoryCard {match} onClick={() => (selectedHistoryMatch = match)} />
							</li>
						{/each}
					</ul>
					{#if historyPageCount > 1}
						<div class="flex items-center justify-between gap-3 text-sm">
							<button
								type="button"
								class="font-medium text-brand-700 disabled:text-slate-400"
								disabled={historyPage <= 1}
								onclick={() => (historyPage -= 1)}
							>
								Previous
							</button>
							<span class="text-slate-500">
								Page {historyPage} of {historyPageCount}
							</span>
							<button
								type="button"
								class="font-medium text-brand-700 disabled:text-slate-400"
								disabled={historyPage >= historyPageCount}
								onclick={() => (historyPage += 1)}
							>
								Next
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</section>

	<!-- Settlement actions -->
	<AppCard class="space-y-4 {canCloseSession ? 'border-emerald-200 bg-emerald-50/40' : ''}">
		<div>
			<h2 class="app-section-title">Finish the session</h2>
			<p class="app-section-meta">
				Bill everyone at scheduled end, or end early if play finishes ahead of time — then close once
				every payment is confirmed.
			</p>
		</div>

		{#if session.ended_early}
			<div class="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-sm text-amber-900">
				<strong>Ended early.</strong> Every active player was billed
				{formatThb(data.perPlayerCost)} (full court fee share). Confirm each PromptPay transfer below,
				then close when all payments are approved.
			</div>
		{:else if session.status === 'in_progress' && !data.endReached && !data.settlementStarted}
			<div class="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-700">
				<strong>End session now</strong> — use when play finishes before
				{formatDateTime(session.end_at)}. Bills all {activePlayers.length} active player{activePlayers.length ===
				1
					? ''
					: 's'} immediately at {formatThb(data.perPlayerCost)} each (full scheduled court share).
				Players must pay before leaving; you confirm each transfer, then close. Cannot be undone.
			</div>
		{/if}

		<ul class="space-y-2 text-sm text-slate-700">
			<li class="flex gap-2">
				<span
					class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold {data.settlementStarted
						? 'bg-emerald-100 text-emerald-700'
						: 'bg-slate-200 text-slate-600'}"
				>
					{data.settlementStarted ? '✓' : '1'}
				</span>
				<span>
					<strong>Start settlement</strong>
					{#if session.ended_early}
						— done (session ended early)
					{:else if !data.endReached}
						— available when the session reaches {formatDateTime(session.end_at)}
					{:else if data.settlementStarted}
						— done
					{:else}
						— creates a {formatThb(data.perPlayerCost)} bill for each active player
					{/if}
				</span>
			</li>
			<li class="flex gap-2">
				<span
					class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold {canCloseSession
						? 'bg-emerald-100 text-emerald-700'
						: 'bg-slate-200 text-slate-600'}"
				>
					{canCloseSession ? '✓' : '2'}
				</span>
				<span>
					<strong>Close session</strong>
					{#if !data.allCancellationFeesResolved}
						— resolve outstanding cancellation fees first
					{:else if !data.settlementStarted}
						— unlocks after settlement starts
					{:else if !data.allPaymentsApproved}
						— waiting for {billedPlayerCount - paymentsApprovedCount} more payment{billedPlayerCount -
							paymentsApprovedCount ===
						1
							? ''
							: 's'}
					{:else if !endedOrReached}
						— available after scheduled end
					{:else}
						— ready when you are
					{/if}
				</span>
			</li>
		</ul>

		<div class="flex flex-col gap-2 sm:flex-row">
			{#if session.status === 'in_progress' && !data.endReached && !data.settlementStarted}
				<SubmitButton
					type="button"
					variant="secondary"
					class="!w-auto sm:flex-1"
					onclick={() => (endEarlyModalOpen = true)}
				>
					End session now
				</SubmitButton>
			{/if}

			<SubmitButton
				type="button"
				variant="secondary"
				class="!w-auto sm:flex-1"
				disabled={!data.endReached || data.settlementStarted || session.ended_early}
				onclick={() => (settlementModalOpen = true)}
			>
				Start settlement
			</SubmitButton>

			<SubmitButton
				type="button"
				class="!w-auto sm:flex-1"
				disabled={!canCloseSession}
				onclick={() => (closeModalOpen = true)}
			>
				Close session
			</SubmitButton>
		</div>
	</AppCard>
</section>

{#if endEarlyModalOpen}
	<AppModal
		open={endEarlyModalOpen}
		labelledBy="end-early-modal-title"
		onClose={() => (endEarlyModalOpen = false)}
	>
		<div class="overflow-hidden rounded-2xl bg-white shadow-xl">
			<div class="border-b border-amber-200 bg-amber-50 px-4 py-4">
				<h2 id="end-early-modal-title" class="text-lg font-semibold text-amber-900">
					End session now?
				</h2>
				<p class="mt-2 text-sm text-amber-900">
					This ends the session immediately and cannot be undone. All {activePlayers.length} active
					player{activePlayers.length === 1 ? '' : 's'} will be billed
					<strong>{formatThb(data.perPlayerCost)}</strong> each (full court fee share). They must pay
					before leaving — you confirm each transfer here, then close the session.
				</p>
			</div>
			<form
				method="POST"
				action="?/endSessionEarly"
				class="flex flex-wrap justify-end gap-2 p-4"
				use:enhance={handleAction('endEarly')}
			>
				<SubmitButton
					type="button"
					variant="secondary"
					class="!w-auto"
					disabled={actionLoading === 'endEarly'}
					onclick={() => (endEarlyModalOpen = false)}
				>
					Cancel
				</SubmitButton>
				<SubmitButton loading={actionLoading === 'endEarly'} class="!w-auto">
					End session now
				</SubmitButton>
			</form>
		</div>
	</AppModal>
{/if}

{#if settlementModalOpen}
	<AppModal
		open={settlementModalOpen}
		labelledBy="settlement-modal-title"
		onClose={() => (settlementModalOpen = false)}
	>
		<div class="overflow-hidden rounded-2xl bg-white shadow-xl">
			<div class="border-b border-brand-100 bg-brand-50 px-4 py-4">
				<h2 id="settlement-modal-title" class="text-lg font-semibold text-brand-900">
					Start settlement?
				</h2>
				<p class="mt-2 text-sm text-brand-800">
					Each active player will owe <strong>{formatThb(data.perPlayerCost)}</strong> (court fee share).
					They pay via PromptPay on their phone; you confirm each transfer here.
				</p>
			</div>
			<form method="POST" action="?/beginSettlement" class="flex flex-wrap justify-end gap-2 p-4" use:enhance={handleAction('settlement')}>
				<SubmitButton
					type="button"
					variant="secondary"
					class="!w-auto"
					disabled={actionLoading === 'settlement'}
					onclick={() => (settlementModalOpen = false)}
				>
					Cancel
				</SubmitButton>
				<SubmitButton loading={actionLoading === 'settlement'} class="!w-auto">
					Start settlement
				</SubmitButton>
			</form>
		</div>
	</AppModal>
{/if}

{#if closeModalOpen}
	<AppModal open={closeModalOpen} labelledBy="close-modal-title" onClose={() => (closeModalOpen = false)}>
		<div class="overflow-hidden rounded-2xl bg-white shadow-xl">
			<div class="border-b border-brand-100 bg-brand-50 px-4 py-4">
				<h2 id="close-modal-title" class="text-lg font-semibold text-brand-900">Close session?</h2>
				<p class="mt-2 text-sm text-brand-800">
					All {activePlayers.length} active player{activePlayers.length === 1 ? '' : 's'} have
					confirmed payments. Remaining players will be marked as left and the session will be archived.
				</p>
			</div>
			<form method="POST" action="?/closeSession" class="flex flex-wrap justify-end gap-2 p-4" use:enhance={handleAction('close')}>
				<SubmitButton
					type="button"
					variant="secondary"
					class="!w-auto"
					disabled={actionLoading === 'close'}
					onclick={() => (closeModalOpen = false)}
				>
					Cancel
				</SubmitButton>
				<SubmitButton loading={actionLoading === 'close'} class="!w-auto">Close session</SubmitButton>
			</form>
		</div>
	</AppModal>
{/if}

{#snippet adminCourtAction()}
	<SubmitButton
		type="button"
		loading={courtLoadingNumber === selectedCourtMatch?.courtNumber}
		loadingLabel="Opening match…"
		disabled={courtLoadingNumber !== null && courtLoadingNumber !== selectedCourtMatch?.courtNumber}
		onclick={openSelectedCourtMatchControl}
	>
		{selectedCourtMatch?.status === 'suspended' ? 'Resolve score' : 'Open match control'}
	</SubmitButton>
{/snippet}

<MatchmakingModal
	open={matchmakingOpen}
	courtNumber={matchmakingCourt}
	sessionStartAt={session.start_at}
	idlePlayers={idlePlayersForMatchmaking}
	loading={matchmakingLoading}
	onClose={() => {
		matchmakingOpen = false;
		matchmakingCourt = null;
	}}
	onSubmit={submitMatchmaking}
/>

<CourtDetailModal
	open={courtDetailOpen}
	court={selectedCourtMatch}
	onClose={() => {
		courtDetailOpen = false;
		selectedCourtMatch = null;
	}}
	action={adminCourtAction}
/>

<MatchSummaryModal
	open={selectedHistoryMatch !== null}
	match={selectedHistoryMatch}
	onClose={() => (selectedHistoryMatch = null)}
/>
