<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import CourtGrid from '@repo/ui/components/CourtGrid.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import FormToast from '@repo/ui/components/FormToast.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import LayersIcon from '@repo/ui/icons/LayersIcon.svelte';
	import { formatDateTime, formatUptime } from '@repo/ui/datetime';
	import { formatThb, paymentStatusLabel } from '@repo/ui/payments';
	import type { PaymentStatus } from '@repo/ui/payments';
	import { createSupabaseBrowserClient } from '$lib/supabase/client';
	import { sessionStatusBadgeClass, sessionStatusLabel } from '$lib/types/session';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let nowMs = $state(Date.now());
	let settlementModalOpen = $state(false);
	let closeModalOpen = $state(false);
	let actionLoading = $state<string | null>(null);

	const session = $derived(data.session);
	const activePlayers = $derived(data.players.filter((player) => player.status === 'confirmed'));
	const pendingLeaveRequests = $derived(
		data.leaveRequests.filter((request) => request.status === 'pending')
	);
	const toastMessage = $derived(form?.message ?? null);
	const toastVariant = $derived(form?.success ? 'success' : 'error');
	const uptimeLabel = $derived(formatUptime(session.start_at, nowMs));

	const paymentForPlayer = (userId: string) =>
		data.payments.find((payment) => payment.user_id === userId) ?? null;

	const canCloseSession = $derived(
		data.endReached && data.settlementStarted && data.allPaymentsApproved
	);

	const paymentsApprovedCount = $derived(
		activePlayers.filter((player) => paymentForPlayer(player.user_id)?.status === 'approved').length
	);

	const paymentsAwaitingConfirm = $derived(
		data.payments.filter((payment) => payment.status === 'submitted').length
	);

	const needsAttention = $derived(
		pendingLeaveRequests.length > 0 || paymentsAwaitingConfirm > 0
	);

	const paymentProgress = $derived(
		activePlayers.length === 0 ? 100 : Math.round((paymentsApprovedCount / activePlayers.length) * 100)
	);

	const timeUntilEndLabel = $derived.by(() => {
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
		!data.settlementStarted ? 1 : !data.allPaymentsApproved ? 2 : data.endReached ? 3 : 2
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
		const invalidateControl = () => void invalidate('app:session-control');

		const channel = supabase
			.channel(`admin-session-control-${sessionId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'session_players',
					filter: `session_id=eq.${sessionId}`
				},
				invalidateControl
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'payments',
					filter: `session_id=eq.${sessionId}`
				},
				invalidateControl
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'session_leave_requests',
					filter: `session_id=eq.${sessionId}`
				},
				invalidateControl
			)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'sessions',
					filter: `id=eq.${sessionId}`
				},
				invalidateControl
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
			return async ({ result, update }) => {
				await update({ reset: false });
				actionLoading = null;
				if (result.type === 'success') {
					settlementModalOpen = false;
					closeModalOpen = false;
				}
			};
		};
</script>

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
			<span class="app-hero-stat {data.endReached ? 'app-hero-stat--warn' : 'app-hero-stat--success'}">
				{timeUntilEndLabel}
			</span>
		</div>
	</DashboardHero>

	<div
		class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5"
	>
		<span class="flex items-center gap-2 text-sm text-slate-500">
			<span class="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true"></span>
			Uptime
		</span>
		<span class="font-mono text-2xl font-semibold tabular-nums text-slate-900" aria-live="polite">
			{uptimeLabel}
		</span>
	</div>

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

	<!-- Quick stats (2×2 — admin shell is max-w-lg; avoid 4 cols at sm viewport) -->
	<div class="grid grid-cols-2 gap-3">
		<div class="app-card-padded flex min-h-24 flex-col items-center justify-center gap-1 text-center">
			<p class="text-2xl font-bold tabular-nums text-brand-700">{activePlayers.length}</p>
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
			<p class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">Per player</p>
		</div>
		<div class="app-card-padded flex min-h-24 flex-col items-center justify-center gap-1 text-center">
			<p class="text-2xl font-bold tabular-nums text-brand-700">
				{paymentsApprovedCount}/{activePlayers.length || '—'}
			</p>
			<p class="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">Paid</p>
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
								Approve their payment in the checklist below before you can approve leave.
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

	<!-- Payment checklist -->
	<AppCard class="space-y-4">
		<div class="app-section-header">
			<div>
				<h2 class="app-section-title">Payment checklist</h2>
				<p class="app-section-meta">
					{#if data.settlementStarted}
						{paymentsApprovedCount} of {activePlayers.length} players confirmed paid
					{:else if data.endReached}
						Scheduled end reached — start settlement to bill active players.
					{:else}
						Settlement opens at {formatDateTime(session.end_at)}.
					{/if}
				</p>
			</div>
		</div>

		{#if data.settlementStarted && activePlayers.length > 0}
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

		{#if activePlayers.length === 0}
			<EmptyState message="No active players in this session." />
		{:else if !data.settlementStarted}
			<div class="app-muted-panel">
				Payments appear here after you tap <strong>Start settlement</strong> at session end. Early
				leavers get a bill as soon as they request to leave.
			</div>
			<ul class="divide-y divide-slate-100 rounded-2xl border border-slate-200">
				{#each activePlayers as player (player.id)}
					<li class="flex items-center gap-3 px-4 py-3">
						<UserAvatar
							displayName={player.profile?.display_name ?? 'Player'}
							avatarUrl={player.profile?.avatar_url ?? null}
							size="sm"
						/>
						<div class="min-w-0 flex-1">
							<p class="truncate font-medium text-slate-900">
								{player.profile?.display_name ?? 'Unknown player'}
							</p>
							<p class="text-xs text-slate-500">Playing · not billed yet</p>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<ul class="space-y-3">
				{#each activePlayers as player (player.id)}
					{@const payment = paymentForPlayer(player.user_id)}
					{@const status = payment?.status ?? null}
					<li
						class="rounded-2xl border p-4 {status === 'submitted'
							? 'border-sky-200 bg-sky-50/40'
							: status === 'approved'
								? 'border-emerald-200 bg-emerald-50/30'
								: 'border-slate-200 bg-white'}"
					>
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div class="flex min-w-0 items-center gap-3">
								<UserAvatar
									displayName={player.profile?.display_name ?? 'Player'}
									avatarUrl={player.profile?.avatar_url ?? null}
									size="sm"
								/>
								<div class="min-w-0">
									<p class="truncate font-semibold text-slate-900">
										{player.profile?.display_name ?? 'Unknown player'}
									</p>
									<p class="text-xs text-slate-500">{paymentRowHint(status)}</p>
								</div>
							</div>

							<div class="flex flex-wrap items-center gap-2">
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
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</AppCard>

	<!-- Courts & matches -->
	<section class="app-detail-section">
		<div class="app-detail-section-body space-y-4">
			<div class="app-detail-section-header">
				<span class="app-detail-section-icon" aria-hidden="true">
					<LayersIcon class="h-5 w-5" />
				</span>
				<div>
					<h2 class="text-lg font-semibold text-slate-900">Courts & matches</h2>
					<p class="text-sm text-slate-500">Match control arrives in a future update — courts show idle for now.</p>
				</div>
			</div>
			<CourtGrid courtCount={session.court_count} />
			<EmptyState message="No matches recorded yet." />
		</div>
	</section>

	<!-- Settlement actions -->
	<AppCard class="space-y-4 {canCloseSession ? 'border-emerald-200 bg-emerald-50/40' : ''}">
		<div>
			<h2 class="app-section-title">Finish the session</h2>
			<p class="app-section-meta">
				Two actions, in order: bill everyone at end time, then close once every payment is confirmed.
			</p>
		</div>

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
					{#if !data.endReached}
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
					{#if !data.settlementStarted}
						— unlocks after settlement starts
					{:else if !data.allPaymentsApproved}
						— waiting for {activePlayers.length - paymentsApprovedCount} more payment{activePlayers.length -
							paymentsApprovedCount ===
						1
							? ''
							: 's'}
					{:else if !data.endReached}
						— available after scheduled end
					{:else}
						— ready when you are
					{/if}
				</span>
			</li>
		</ul>

		<div class="flex flex-col gap-2 sm:flex-row">
			<SubmitButton
				type="button"
				variant="secondary"
				class="!w-auto sm:flex-1"
				disabled={!data.endReached || data.settlementStarted}
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
