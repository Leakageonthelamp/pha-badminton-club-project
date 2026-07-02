<script lang="ts">
	import { t } from '$lib/i18n';
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import FormToast from '@repo/ui/components/FormToast.svelte';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import RichTextDisplay from '@repo/ui/components/RichTextDisplay.svelte';
	import SessionLiveTimers from '@repo/ui/components/SessionLiveTimers.svelte';
	import SessionStartCountdown from '@repo/ui/components/SessionStartCountdown.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import UserGroupIcon from '@repo/ui/icons/UserGroupIcon.svelte';
	import ClipboardDocumentListIcon from '@repo/ui/icons/ClipboardDocumentListIcon.svelte';
	import TagIcon from '@repo/ui/icons/TagIcon.svelte';
	import TrophyIcon from '@repo/ui/icons/TrophyIcon.svelte';
	import UserIcon from '@repo/ui/icons/UserIcon.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { formatDate, formatDateTime, formatSessionDuration, formatTime } from '@repo/ui/datetime';
	import { subscribePostgresChangesWithPollFallback } from '@repo/ui/realtimeSubscribe';
	import { computeCourtTotal } from '@repo/ui/payments';
	import { formatThb } from '$lib/types/club';
	import {
		matchTypeLabel,
		sessionPlayerStatusLabel,
		sessionStatusBadgeClass,
		sessionStatusHeroClass,
		sessionStatusLabel,
		sessionStatusShowsLiveDot
	} from '$lib/types/session';
	import SessionHistoryDetail from '$lib/components/SessionHistoryDetail.svelte';
	import SessionCancellationFees from '$lib/components/SessionCancellationFees.svelte';
	import { createSupabaseBrowserClient } from '$lib/supabase/client';
	import { toast } from '@repo/ui/toast/toast.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let forceEndLoading = $state(false);
	let forceEndModalOpen = $state(false);
	let openLoading = $state(false);
	let openModalOpen = $state(false);
	let cancelLoading = $state(false);
	let cancelModalOpen = $state(false);
	let playerActionLoading = $state<string | null>(null);
	let feeActionLoading = $state<string | null>(null);
	let controlNavLoading = $state(false);
	let nowMs = $state(Date.now());

	const session = $derived(data.session);
	const endReached = $derived(nowMs >= new Date(session.end_at).getTime());
	const endedOrReached = $derived(endReached || session.ended_early);
	const settlementStarted = $derived(
		session.settlement_started_at != null || session.ended_early
	);
	const sessionEndedLabel = $derived(
		session.ended_early ? t('control.endedEarly') : t('control.sessionEnded')
	);

	const goToSessionControl = () => {
		if (controlNavLoading) return;
		controlNavLoading = true;
		void goto(`/sessions/${session.id}/control`).finally(() => {
			controlNavLoading = false;
		});
	};
	const waitingPlayers = $derived(data.players.filter((p) => p.status === 'waiting'));
	const queuedPlayers = $derived(data.players.filter((p) => p.status === 'queued'));
	const confirmedPlayers = $derived(data.players.filter((p) => p.status === 'confirmed'));
	const toastMessage = $derived(form?.message ?? null);
	const toastVariant = $derived(form?.success ? 'success' : 'error');

	let flashToastShown = $state(false);
	let startSweepTriggered = $state(false);

	$effect(() => {
		session.id;
		startSweepTriggered = false;
	});

	$effect(() => {
		if (!browser) return;
		if (session.status !== 'in_progress' && session.status !== 'open') return;

		const timer = window.setInterval(() => {
			nowMs = Date.now();
		}, 1_000);

		return () => window.clearInterval(timer);
	});

	$effect(() => {
		if (
			!browser ||
			session.status !== 'open' ||
			startSweepTriggered ||
			nowMs < new Date(session.start_at).getTime()
		) {
			return;
		}

		startSweepTriggered = true;
		void invalidate('app:session-detail');
	});

	$effect(() => {
		if (!browser) return;

		const supabase = createSupabaseBrowserClient();
		const sessionId = session.id;

		return subscribePostgresChangesWithPollFallback(
			supabase,
			`admin-session-detail-${sessionId}`,
			[
				{ event: 'UPDATE', table: 'sessions', filter: `id=eq.${sessionId}` },
				{ table: 'session_players', filter: `session_id=eq.${sessionId}` }
			],
			() => void invalidate('app:session-detail')
		);
	});

	$effect(() => {
		if (flashToastShown) return;

		const flashMessage = data.edited
			? t('sessions.updatedDraft')
			: data.created
				? t('sessions.created')
				: null;
		if (!flashMessage) return;

		flashToastShown = true;
		toast.show(flashMessage, 'success');

		if (page.url.searchParams.has('created') || page.url.searchParams.has('edited')) {
			void goto(page.url.pathname, { replaceState: true, keepFocus: true, noScroll: true });
		}
	});

	const locationLabel = $derived(
		session.latitude !== null && session.longitude !== null
			? `${session.latitude.toFixed(5)}, ${session.longitude.toFixed(5)}`
			: null
	);

	const mapsUrl = $derived(
		session.latitude !== null && session.longitude !== null
			? `https://www.google.com/maps?q=${session.latitude},${session.longitude}`
			: null
	);

	const shuttleLabel = $derived(
		session.shuttle
			? `${session.shuttle.name} · ${formatThb(session.shuttle_price_per_each)} each`
			: '—'
	);

	const estimatedCourtCost = $derived(
		computeCourtTotal({
			courtFeePerHour: session.court_fee_per_hour,
			startAt: session.start_at,
			endAt: session.end_at,
			courtCount: session.court_count
		})
	);

	const handleForceEnd: SubmitFunction = () => {
		forceEndLoading = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			forceEndLoading = false;
			if (result.type === 'success') {
				forceEndModalOpen = false;
			}
		};
	};

	const handleOpenSession: SubmitFunction = () => {
		openLoading = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			openLoading = false;
			if (result.type === 'success') {
				openModalOpen = false;
			}
		};
	};

	const handleCancelSession: SubmitFunction = () => {
		cancelLoading = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			cancelLoading = false;
			if (result.type === 'success') {
				cancelModalOpen = false;
			}
		};
	};

	const handlePlayerAction =
		(playerId: string): SubmitFunction =>
		() => {
			playerActionLoading = playerId;
			return async ({ result, update }) => {
				await update({ reset: false });
				playerActionLoading = null;
			};
		};

	const participantActionClass = '!w-auto !rounded-lg !px-3 !py-1.5 !text-sm';
</script>

{#snippet participantsSection()}
	{#if data.canManage && session.status !== 'draft'}
		<AppCard class="space-y-6">
			<div>
				<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('sessions.detail.participants')}</h2>
				<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
					Confirm or reject waiting players from 15 minutes before start until session end.
				</p>
				{#if !data.adminActionWindowOpen}
					<p class="mt-2 text-sm text-amber-800">
						Confirm/reject actions open 15 minutes before the session starts.
					</p>
				{/if}
			</div>

			<div class="space-y-3">
				<h3 class="app-section-heading">
					Waiting list ({waitingPlayers.length})
				</h3>
				{#if waitingPlayers.length === 0}
					<p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('sessions.detail.noWaiting')}</p>
				{:else}
					<ul class="divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
						{#each waitingPlayers as player (player.id)}
							<li class="bg-white dark:bg-slate-900 px-4 py-3">
								<div class="flex flex-wrap items-center justify-between gap-3">
									<div class="flex min-w-0 items-center gap-3">
										<UserAvatar
											displayName={player.profile?.display_name ?? t('role.player')}
											avatarUrl={player.profile?.avatar_url ?? null}
											size="sm"
										/>
										<div class="min-w-0">
											<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
												<p class="truncate font-medium text-slate-900 dark:text-slate-100">
													{player.profile?.display_name ?? t('common.unknown')}
												</p>
												{#if player.profile?.tag}
													<TagPill tag={player.profile.tag} />
												{/if}
											</div>
											<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
												{sessionPlayerStatusLabel(player.status)} · joined
												{formatDateTime(player.joined_at)}
											</p>
										</div>
									</div>
									{#if data.adminActionWindowOpen}
										<div class="flex shrink-0 items-center gap-2">
											<form
												method="POST"
												action="?/confirm"
												use:enhance={handlePlayerAction(player.id)}
											>
												<input type="hidden" name="session_id" value={session.id} />
												<input type="hidden" name="player_id" value={player.id} />
												<SubmitButton
													class={participantActionClass}
													loading={playerActionLoading === player.id}
													loadingLabel="…"
													disabled={playerActionLoading !== null &&
														playerActionLoading !== player.id}
												>
													Confirm
												</SubmitButton>
											</form>
											<form
												method="POST"
												action="?/reject"
												use:enhance={handlePlayerAction(player.id)}
											>
												<input type="hidden" name="session_id" value={session.id} />
												<input type="hidden" name="player_id" value={player.id} />
												<SubmitButton
													variant="secondary"
													class={participantActionClass}
													loading={playerActionLoading === player.id}
													loadingLabel="…"
													disabled={playerActionLoading !== null &&
														playerActionLoading !== player.id}
												>
													Reject
												</SubmitButton>
											</form>
										</div>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="space-y-3">
				<h3 class="app-section-heading">
					Buffer queue ({queuedPlayers.length}/{session.max_buffer})
				</h3>
				{#if queuedPlayers.length === 0}
					<p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('sessions.detail.noQueued')}</p>
				{:else}
					<ul class="divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
						{#each queuedPlayers as player (player.id)}
							<li class="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-3">
								<UserAvatar
									displayName={player.profile?.display_name ?? t('role.player')}
									avatarUrl={player.profile?.avatar_url ?? null}
									size="sm"
								/>
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
										<p class="truncate font-medium text-slate-900 dark:text-slate-100">
											{player.profile?.display_name ?? t('common.unknown')}
										</p>
										{#if player.profile?.tag}
											<TagPill tag={player.profile.tag} />
										{/if}
									</div>
									<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
										{sessionPlayerStatusLabel(player.status)} · joined
										{formatDateTime(player.joined_at)}
									</p>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="space-y-3">
				<h3 class="app-section-heading">Confirmed ({confirmedPlayers.length})</h3>
				{#if confirmedPlayers.length === 0}
					<p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('sessions.detail.noConfirmed')}</p>
				{:else}
					<ul class="divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
						{#each confirmedPlayers as player (player.id)}
							<li class="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-3">
								<UserAvatar
									displayName={player.profile?.display_name ?? t('role.player')}
									avatarUrl={player.profile?.avatar_url ?? null}
									size="sm"
								/>
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
										<p class="truncate font-medium text-slate-900 dark:text-slate-100">
											{player.profile?.display_name ?? t('common.unknown')}
										</p>
										{#if player.profile?.tag}
											<TagPill tag={player.profile.tag} />
										{/if}
									</div>
									<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
										Confirmed {player.decided_at ? formatDateTime(player.decided_at) : '—'}
									</p>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</AppCard>
	{/if}
{/snippet}

<FormToast message={toastMessage} variant={toastVariant} token={toastMessage ?? ''} />

{#if data.isHistoryView}
	<SessionHistoryDetail
		session={data.session}
		players={data.historyPlayers}
		payments={data.historyPayments}
		matches={data.historyMatches}
		canManageFees={data.canManage}
		cancellationFees={data.cancellationFees}
		sessionId={session.id}
		bind:feeActionLoading
	/>
{:else}
	<section class="space-y-6">
		<div class="grid gap-6 lg:items-stretch">
			<DashboardHero
				eyebrow={t('sessions.detail.eyebrow')}
				title={session.name}
				subtitle={session.club?.name ?? t('control.clubSessionFallback')}
			>
				<div class="app-hero-status {sessionStatusHeroClass(session.status)}">
					<span
						class="app-hero-status-dot {sessionStatusShowsLiveDot(session.status)
							? 'animate-pulse'
							: ''}"
						aria-hidden="true"
					></span>
					<div class="min-w-0 flex-1">
						<p class="app-hero-status-label">{t('sessions.detail.statusLabel')}</p>
						<p class="app-hero-status-value">{sessionStatusLabel(session.status)}</p>
					</div>
					{#if data.isHost}
						<span class="app-hero-badge shrink-0">{t('sessions.detail.youCreated')}</span>
					{:else}
						<span class="app-hero-badge shrink-0">{t('sessions.detail.observationOnly')}</span>
					{/if}
				</div>
				{#if endedOrReached && session.status === 'in_progress'}
					<p class="app-hero-stat app-hero-stat--warn">{sessionEndedLabel}</p>
				{/if}
			</DashboardHero>

			{#if data.canControl}
				<AppCard
					class="flex h-full flex-col justify-between gap-4 {endedOrReached
						? 'border-rose-200 bg-rose-50/60'
						: 'border-sky-200 bg-sky-50/60'}"
				>
					<div>
						{#if endedOrReached}
							<h2 class="text-lg font-semibold text-rose-900">
								{settlementStarted ? t('common.settlementInProgress') : sessionEndedLabel}
							</h2>
							<p class="mt-1 text-sm text-rose-800">
								{#if settlementStarted}
									Open session control to confirm payments and close the session.
								{:else}
									Scheduled end has passed. Open session control to start settlement, confirm
									payments, and close the session.
								{/if}
							</p>
						{:else}
							<h2 class="text-lg font-semibold text-sky-900">{t('sessions.detail.inProgressTitle')}</h2>
							<p class="mt-1 text-sm text-sky-800">
								Open session control to manage live play, courts, and participants.
							</p>
						{/if}
					</div>
					<SubmitButton
						type="button"
						class="w-full! sm:w-auto"
						loading={controlNavLoading}
						loadingLabel={t('sessions.detail.opening')}
						onclick={goToSessionControl}
					>
						Session control
					</SubmitButton>
				</AppCard>
			{/if}
		</div>

		{#if session.status === 'in_progress'}
			<SessionLiveTimers
				startAt={session.start_at}
				endAt={session.end_at}
				showRemaining={!endedOrReached}
				showOverdue={endedOrReached}
				variant="banner"
			/>
		{/if}

		<SessionStartCountdown
			startAt={session.start_at}
			active={session.status === 'open'}
			showUntilStart
			class="mt-4"
		/>

		{@render participantsSection()}

		{#if data.canManage && data.cancellationFees.length > 0}
			<AppCard class="space-y-4">
				<div>
					<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('sessions.detail.cancellationFees')}</h2>
					<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
						Late cancellations waiting for payment or admin confirmation.
					</p>
				</div>
				<SessionCancellationFees
					fees={data.cancellationFees}
					sessionId={session.id}
					bind:feeActionLoading
				/>
			</AppCard>
		{/if}

		{#if session.status === 'draft'}
			<AppCard class="space-y-4 border-amber-200 bg-amber-50/60">
				<div>
					<h2 class="text-lg font-semibold text-amber-900">{t('sessions.detail.draftTitle')}</h2>
					<p class="mt-2 text-sm text-amber-800">
						This session is hidden from players until you open it. Open by
						{formatDateTime(data.draftOpenDeadline)} (1 hour before start) or it will be auto-cancelled.
					</p>
				</div>
				{#if data.canOpen}
					<SubmitButton type="button" class="!w-auto" onclick={() => (openModalOpen = true)}>
						Open session
					</SubmitButton>
				{:else if data.canManage}
					<p class="text-sm text-amber-800">{t('sessions.detail.openWindowPassed')}</p>
				{/if}
			</AppCard>
		{/if}

		{#if data.canModify}
			<AppCard class="space-y-4">
				<div>
					<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('sessions.detail.manage')}</h2>
					<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
						Edit or cancel until 15 minutes before start. After that, changes are locked.
					</p>
				</div>
				<div class="flex flex-wrap gap-2">
					<SubmitButton
						type="button"
						variant="secondary"
						class="!w-auto"
						onclick={() => goto(`/sessions/${session.id}/edit`)}
					>
						Edit session
					</SubmitButton>
					<SubmitButton
						type="button"
						variant="ghost"
						class="!w-auto !text-red-700 hover:!bg-red-50"
						onclick={() => (cancelModalOpen = true)}
					>
						Cancel session
					</SubmitButton>
				</div>
			</AppCard>
		{/if}

		<AppCard class="space-y-4">
			<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('clubs.create.descriptionLabel')}</h2>
			<RichTextDisplay html={session.description} />
		</AppCard>

		<section class="app-detail-section">
			<div
				class="border-b border-brand-100 bg-gradient-to-br from-brand-50 dark:from-slate-900 via-white to-brand-50/50 px-4 py-4 sm:px-6"
			>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<div class="app-history-stat">
						<p class="app-history-stat-label">{t('sessionForm.start')}</p>
						<p class="app-history-stat-value">{formatTime(session.start_at)}</p>
						<p class="app-history-stat-hint">{formatDate(session.start_at)}</p>
					</div>
					<div class="app-history-stat border-brand-200/80 bg-brand-50/50">
						<p class="app-history-stat-label">{t('sessions.detail.duration')}</p>
						<p class="app-history-stat-value">
							{formatSessionDuration(session.start_at, session.end_at)}
						</p>
						<p class="app-history-stat-hint">
							{session.court_count} court{session.court_count === 1 ? '' : 's'}
						</p>
					</div>
					<div class="app-history-stat">
						<p class="app-history-stat-label">{t('sessionForm.end')}</p>
						<p class="app-history-stat-value">{formatTime(session.end_at)}</p>
						<p class="app-history-stat-hint">{formatDate(session.end_at)}</p>
					</div>
				</div>
			</div>

			<div class="app-detail-section-body space-y-6">
				<div class="app-detail-section-header">
					<span class="app-detail-section-icon" aria-hidden="true">
						<ClipboardDocumentListIcon class="h-5 w-5" />
					</span>
					<div>
						<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('sessionForm.details')}</h2>
						<p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('sessions.detail.detailsSubtitle')}</p>
					</div>
				</div>

				<div class="space-y-3">
					<h3 class="app-section-heading">{t('sessions.detail.overview')}</h3>
					<dl class="app-detail-contact-grid">
						<div class="app-detail-contact-item">
							<dt class="app-detail-contact-label">
								<span class="inline-flex items-center gap-1.5">
									<UserGroupIcon class="h-4 w-4 text-brand-500" />
									Club
								</span>
							</dt>
							<dd class="app-detail-contact-value">{session.club?.name ?? '—'}</dd>
						</div>
						<div class="app-detail-contact-item">
							<dt class="app-detail-contact-label">
								<span class="inline-flex items-center gap-1.5">
									<UserIcon class="h-4 w-4 text-brand-500" />
									Host
								</span>
							</dt>
							<dd class="app-detail-contact-value">{session.host?.display_name ?? '—'}</dd>
						</div>
						<div class="app-detail-contact-item sm:col-span-2">
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

				<div class="space-y-3">
					<h3 class="app-section-heading">{t('sessionForm.venue')}</h3>
					<dl class="app-detail-contact-grid">
						<div class="app-detail-contact-item app-detail-contact-item--wide">
							<dt class="app-detail-contact-label">{t('clubs.detail.location.venueLabel')}</dt>
							<dd class="app-detail-contact-value text-base">{session.venue_name ?? '—'}</dd>
						</div>
						<div class="app-detail-contact-item app-detail-contact-item--wide">
							<dt class="app-detail-contact-label">{t('sessions.detail.mapCoordinates')}</dt>
							<dd class="app-detail-contact-value">
								{#if locationLabel && mapsUrl}
									<a
										href={mapsUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="font-mono text-sm text-brand-700 dark:text-brand-300 underline decoration-brand-200 underline-offset-2 hover:text-brand-800"
									>
										{locationLabel}
									</a>
									<span class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('sessions.detail.openInMaps')}</span>
								{:else}
									<span class="text-slate-500 dark:text-slate-400 dark:text-slate-500">—</span>
								{/if}
							</dd>
						</div>
					</dl>
				</div>

				<div class="space-y-3">
					<h3 class="app-section-heading">{t('sessions.detail.capacityPricing')}</h3>
					<dl class="app-detail-meta-grid">
						<div class="app-detail-meta-item">
							<dt class="app-detail-meta-label">{t('sessions.detail.players')}</dt>
							<dd class="app-detail-meta-value">
								<span class="text-lg font-semibold text-brand-700">{session.min_players}</span>
								<span class="text-slate-400 dark:text-slate-500"> – </span>
								<span class="text-lg font-semibold text-brand-700">{session.max_players}</span>
								<span class="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('sessions.detail.minMax')}</span>
							</dd>
						</div>
						<div class="app-detail-meta-item">
							<dt class="app-detail-meta-label">{t('sessions.detail.courts')}</dt>
							<dd class="app-detail-meta-value">
								<span class="text-lg font-semibold text-brand-700">{session.court_count}</span>
							</dd>
						</div>
						<div class="app-detail-meta-item">
							<dt class="app-detail-meta-label">{t('sessions.detail.courtFeeHour')}</dt>
							<dd class="app-detail-meta-value text-base text-brand-800">
								{formatThb(session.court_fee_per_hour)}
							</dd>
						</div>
						<div class="app-detail-meta-item">
							<dt class="app-detail-meta-label">{t('sessions.detail.estCourtCost')}</dt>
							<dd class="app-detail-meta-value text-base text-brand-800">
								{formatThb(estimatedCourtCost)}
							</dd>
						</div>
						<div class="app-detail-meta-item sm:col-span-2">
							<dt class="app-detail-meta-label">{t('sessions.detail.fixedCourtFee')}</dt>
							<dd class="app-detail-meta-value text-base text-brand-800">
								{#if session.fixed_court_fee_per_player !== null}
									{formatThb(session.fixed_court_fee_per_player)}
									<span class="ml-1 text-xs font-normal text-emerald-600">
										court profit {formatThb(
											session.fixed_court_fee_per_player * confirmedPlayers.length - estimatedCourtCost
										)} @ {confirmedPlayers.length} confirmed
									</span>
								{:else}
									<span class="text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('sessions.detail.splitEvenly')}</span>
								{/if}
							</dd>
						</div>
						<div class="app-detail-meta-item sm:col-span-2">
							<dt class="app-detail-meta-label">{t('sessionForm.shuttle')}</dt>
							<dd class="app-detail-meta-value">{shuttleLabel}</dd>
						</div>
						<div class="app-detail-meta-item">
							<dt class="app-detail-meta-label">{t('sessions.detail.bufferQueue')}</dt>
							<dd class="app-detail-meta-value">
								<span class="text-lg font-semibold text-brand-700">{session.max_buffer}</span>
								<span class="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('sessions.detail.maxOverflow')}</span>
							</dd>
						</div>
						<div class="app-detail-meta-item">
							<dt class="app-detail-meta-label">{t('sessions.detail.lateCancelFee')}</dt>
							<dd class="app-detail-meta-value text-base text-brand-800">
								{formatThb(session.cancellation_fee)}
							</dd>
						</div>
					</dl>
				</div>

				<div class="space-y-3">
					<h3 class="app-section-heading">{t('sessionForm.matchSettings')}</h3>
					<dl class="app-detail-contact-grid">
						<div class="app-detail-contact-item">
							<dt class="app-detail-contact-label">
								<span class="inline-flex items-center gap-1.5">
									<TrophyIcon class="h-4 w-4 text-brand-500" />
									Match score
								</span>
							</dt>
							<dd class="app-detail-contact-value">{session.match_score_type} points</dd>
						</div>
						<div class="app-detail-contact-item">
							<dt class="app-detail-contact-label">
								<span class="inline-flex items-center gap-1.5">
									<TagIcon class="h-4 w-4 text-brand-500" />
									Match type
								</span>
							</dt>
							<dd class="app-detail-contact-value">{matchTypeLabel(session.match_type)}</dd>
						</div>
					</dl>
				</div>
			</div>
		</section>

		{#if data.isSuperAdmin && session.status !== 'closed' && session.status !== 'cancelled'}
			<AppCard class="space-y-4 border-red-200 bg-red-50/40">
				<div>
					<h2 class="text-lg font-semibold text-red-900">{t('clubs.detail.dangerZone')}</h2>
					<p class="mt-2 text-sm text-red-800">
						Force end this session immediately. Super admins only.
					</p>
				</div>
				<SubmitButton
					type="button"
					variant="ghost"
					class="!w-auto !text-red-700 hover:!bg-red-100"
					onclick={() => (forceEndModalOpen = true)}
				>
					Force end session
				</SubmitButton>
			</AppCard>
		{/if}
	</section>
{/if}

{#if !data.isHistoryView && forceEndModalOpen}
	<AppModal
		open={forceEndModalOpen}
		labelledBy="force-end-session-title"
		onClose={() => (forceEndModalOpen = false)}
	>
		<div class="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-xl">
			<div class="border-b border-red-100 bg-red-50 px-4 py-4">
				<h2 id="force-end-session-title" class="text-lg font-semibold text-red-900">
					Force end session?
				</h2>
				<p class="mt-2 text-sm text-red-800">
					This will set the session status to closed. Players and match flow are not updated in v1.
				</p>
			</div>
			<form
				method="POST"
				action="?/forceEnd"
				class="flex flex-wrap gap-2 p-4"
				use:enhance={handleForceEnd}
			>
				<SubmitButton loading={forceEndLoading} loadingLabel={t('sessions.detail.ending')} class="!w-auto">
					Force end session
				</SubmitButton>
				<SubmitButton
					type="button"
					variant="secondary"
					class="!w-auto"
					disabled={forceEndLoading}
					onclick={() => (forceEndModalOpen = false)}
				>
					Cancel
				</SubmitButton>
			</form>
		</div>
	</AppModal>
{/if}

{#if !data.isHistoryView && openModalOpen}
	<AppModal
		open={openModalOpen}
		labelledBy="open-session-title"
		onClose={() => (openModalOpen = false)}
	>
		<div class="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-xl">
			<div class="border-b border-brand-100 bg-brand-50 px-4 py-4">
				<h2 id="open-session-title" class="text-lg font-semibold text-brand-900">{t('sessions.detail.openSessionTitle')}</h2>
				<p class="mt-2 text-sm text-brand-800">
					Players will be able to discover and join this session once it is open.
				</p>
			</div>
			<form
				method="POST"
				action="?/openSession"
				class="flex flex-wrap gap-2 p-4"
				use:enhance={handleOpenSession}
			>
				<SubmitButton loading={openLoading} loadingLabel={t('sessions.detail.opening')} class="!w-auto">
					Open session
				</SubmitButton>
				<SubmitButton
					type="button"
					variant="secondary"
					class="!w-auto"
					disabled={openLoading}
					onclick={() => (openModalOpen = false)}
				>
					Cancel
				</SubmitButton>
			</form>
		</div>
	</AppModal>
{/if}

{#if !data.isHistoryView && cancelModalOpen}
	<AppModal
		open={cancelModalOpen}
		labelledBy="cancel-session-title"
		onClose={() => (cancelModalOpen = false)}
	>
		<div class="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-xl">
			<div class="border-b border-red-100 bg-red-50 px-4 py-4">
				<h2 id="cancel-session-title" class="text-lg font-semibold text-red-900">
					Cancel session?
				</h2>
				<p class="mt-2 text-sm text-red-800">
					This will cancel the session and release all waiting and queued players without a fee.
				</p>
			</div>
			<form
				method="POST"
				action="?/cancel"
				class="flex flex-wrap gap-2 p-4"
				use:enhance={handleCancelSession}
			>
				<SubmitButton loading={cancelLoading} loadingLabel={t('sessions.detail.cancelling')} class="!w-auto">
					Cancel session
				</SubmitButton>
				<SubmitButton
					type="button"
					variant="secondary"
					class="!w-auto"
					disabled={cancelLoading}
					onclick={() => (cancelModalOpen = false)}
				>
					Keep session
				</SubmitButton>
			</form>
		</div>
	</AppModal>
{/if}
