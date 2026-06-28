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
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import { formatDateTime, formatUptime } from '@repo/ui/datetime';
	import { formatThb, paymentStatusLabel } from '@repo/ui/payments';
	import PaymentQr from '$lib/components/PaymentQr.svelte';
	import {
		canRequestEarlyLeave,
		deriveLiveSessionUiState,
		shouldShowPaymentModal
	} from '$lib/sessions/liveState';
	import { createSupabaseBrowserClient } from '$lib/supabase/client';
	import { sessionStatusBadgeClass, sessionStatusLabel } from '$lib/types/session';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let nowMs = $state(Date.now());
	let actionLoading = $state<string | null>(null);

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
	const showPaymentModal = $derived(
		shouldShowPaymentModal(uiState, data.myPayment?.status ?? null)
	);

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
		eyebrow="Live session"
		title={session.name}
		subtitle={session.club?.name ?? 'Session'}
	>
		<div class="flex flex-wrap items-center gap-2">
			<span class="rounded-full px-2 py-0.5 text-xs font-medium {sessionStatusBadgeClass(session.status)}">
				{sessionStatusLabel(session.status)}
			</span>
		</div>
	</DashboardHero>

	{#if session.status === 'in_progress'}
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
	{/if}

	<FormToast message={toastMessage} variant={toastVariant} />

	{#if uiState === 'summary'}
		<AppCard class="space-y-4">
			<SectionHeading title="Session summary" />
			<p class="text-sm text-slate-600">
				Your session is complete. Court fee
				{#if data.myPayment}
					of {formatThb(data.myPayment.total_amount)} was {paymentStatusLabel(data.myPayment.status).toLowerCase()}.
				{:else}
					was {formatThb(data.perPlayerCost)}.
				{/if}
			</p>
			<p class="text-sm text-slate-600">
				{formatDateTime(session.start_at)} – {formatDateTime(session.end_at)}
			</p>
			<button type="button" class="app-btn-primary w-full" onclick={() => goto('/')}>
				Back to home
			</button>
		</AppCard>
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

		<AppCard class="space-y-4">
			<SectionHeading title="Session details" />
			<dl class="grid gap-3 text-sm">
				<div>
					<dt class="text-slate-500">Schedule</dt>
					<dd class="font-medium text-slate-800">
						{formatDateTime(session.start_at)} – {formatDateTime(session.end_at)}
					</dd>
				</div>
				<div>
					<dt class="text-slate-500">Venue</dt>
					<dd class="font-medium text-slate-800">{session.venue_name ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-slate-500">Courts</dt>
					<dd class="font-medium text-slate-800">{session.court_count}</dd>
				</div>
			</dl>
		</AppCard>

		<AppCard class="space-y-4">
			<SectionHeading title="Active players" />
			{#if data.activePlayers.length === 0}
				<EmptyState message="No active players right now." />
			{:else}
				<ul class="divide-y divide-slate-100">
					{#each data.activePlayers as player (player.id)}
						<li class="flex items-center gap-3 py-3">
							<UserAvatar
								displayName={player.profile?.display_name ?? 'Player'}
								avatarUrl={player.profile?.avatar_url ?? null}
								size="sm"
							/>
							<div class="min-w-0">
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
						</li>
					{/each}
				</ul>
			{/if}
		</AppCard>

		<AppCard class="space-y-4">
			<SectionHeading title="Your match history" />
			<EmptyState message="No matches recorded yet." />
		</AppCard>

		<AppCard class="space-y-4">
			<SectionHeading title="Courts" />
			<CourtGrid courtCount={session.court_count} />
		</AppCard>

		<AppCard class="space-y-4">
			<SectionHeading title="Early leave" />
			{#if uiState === 'leave_pending'}
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
