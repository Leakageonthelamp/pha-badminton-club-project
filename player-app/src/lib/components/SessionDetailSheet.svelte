<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';
	import RichTextDisplay from '@repo/ui/components/RichTextDisplay.svelte';
	import SessionDurationPill from '@repo/ui/components/SessionDurationPill.svelte';
	import SessionLiveTimers from '@repo/ui/components/SessionLiveTimers.svelte';
	import SessionStartCountdown from '@repo/ui/components/SessionStartCountdown.svelte';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import CancellationFeeModal from '$lib/components/CancellationFeeModal.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import { portal } from '@repo/ui/actions/portal';
	import { toast } from '@repo/ui/toast/toast.svelte';
	import { t } from '@repo/ui/i18n';
	import {
		formatDistanceKm,
		haversineDistanceKm,
		loadStoredUserLocation,
		appleMapsSearchUrl,
		mapsSearchUrl
	} from '@repo/ui/geolocation';
	import { formatDateTime } from '@repo/ui/datetime';
	import {
		computePlayerShuttleShare,
		courtFeePerPlayerModeHint,
		courtFeePerPlayerModeLabel
	} from '@repo/ui/payments';
	import type { SessionDetail, SessionListItem, SessionPlayerStatus, SessionStatus } from '$lib/types/session';
	import { liveSessionHref, shouldOpenLiveSession } from '$lib/sessions/navigation';
	import { isLiveSessionEnded, isPlayerEarlyLeave } from '$lib/sessions/liveState';
	import { joinConflictMembershipPhrase } from '$lib/sessions/joinConflict';
	import { SESSION_CANCEL_LOCK_LEAD_MINUTES, SESSION_JOIN_CLOSE_LEAD_MINUTES, LIVE_SESSION_JOIN_BUFFER_HOURS } from '$lib/config/session';
	import {
		formatThb,
		matchTypeLabel,
		sessionPlayerStatusLabel,
		sessionStatusBadgeClass,
		sessionStatusLabel
	} from '$lib/types/session';

	let {
		open = false,
		sessionId = null,
		preview = null,
		onClose
	}: {
		open?: boolean;
		sessionId?: string | null;
		preview?: SessionListItem | null;
		onClose: () => void;
	} = $props();

	let show = $state(false);
	let visible = $state(false);
	let loading = $state(false);
	let loadError = $state<string | null>(null);
	let session = $state<SessionDetail | null>(null);
	let panelEl = $state<HTMLDivElement | null>(null);
	let dragOffset = $state(0);
	let dragging = $state(false);
	let dragStartY = 0;
	let dragStartOffset = 0;
	let actionLoading = $state(false);
	let liveNavLoading = $state(false);
	let joinModalOpen = $state(false);
	let cancelConfirmOpen = $state(false);
	let feeModalOpen = $state(false);
	let feeModalPlayerId = $state<string | null>(null);
	let feeModalAmount = $state(0);
	let feeModalStatus = $state<'owed' | 'submitted'>('owed');
	let lastPolledSessionStatus = $state<SessionStatus | null>(null);
	let lastPolledMembershipStatus = $state<SessionPlayerStatus | null>(null);
	let nowMs = $state(Date.now());

	const DISMISS_DRAG_PX = 120;

	const panelTransform = $derived.by(() => {
		if (dragOffset > 0) return `translateY(${dragOffset}px)`;
		if (visible) return 'translateY(0)';
		return 'translateY(100%)';
	});

	const backdropOpacity = $derived.by(() => {
		if (!visible) return 0;
		const height = panelEl?.getBoundingClientRect().height ?? window.innerHeight * 0.9;
		if (dragOffset <= 0 || height <= 0) return 1;
		return Math.max(0, 1 - dragOffset / height);
	});

	const resetDrag = () => {
		dragOffset = 0;
		dragging = false;
	};

	const close = () => {
		resetDrag();
		visible = false;
		window.setTimeout(onClose, 220);
	};

	const dismissFromDrag = () => {
		const height = panelEl?.getBoundingClientRect().height ?? window.innerHeight * 0.9;
		dragging = false;
		dragOffset = height;
		window.setTimeout(() => {
			visible = false;
			window.setTimeout(() => {
				onClose();
				resetDrag();
			}, 50);
		}, 280);
	};

	const onDragStart = (event: PointerEvent) => {
		if (!visible || event.button !== 0) return;

		dragging = true;
		dragStartY = event.clientY;
		dragStartOffset = dragOffset;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	};

	const onDragMove = (event: PointerEvent) => {
		if (!dragging) return;
		const delta = event.clientY - dragStartY;
		dragOffset = Math.max(0, dragStartOffset + delta);
	};

	const onDragEnd = (event: PointerEvent) => {
		if (!dragging) return;

		const handle = event.currentTarget as HTMLElement;
		if (handle.hasPointerCapture(event.pointerId)) {
			handle.releasePointerCapture(event.pointerId);
		}

		if (dragOffset >= DISMISS_DRAG_PX) {
			dismissFromDrag();
			return;
		}

		dragging = false;
		dragOffset = 0;
	};

	const onKeydown = (event: KeyboardEvent) => {
		if (event.key !== 'Escape') return;
		if (joinModalOpen || cancelConfirmOpen || feeModalOpen) return;
		close();
	};

	const closeJoinModal = () => {
		joinModalOpen = false;
	};

	const activeSession = $derived(session ?? preview);
	const sessionEnded = $derived(
		activeSession
			? isLiveSessionEnded({
					status: activeSession.status,
					endAtMs: Date.parse(activeSession.end_at),
					nowMs
				})
			: false
	);
	const playerEarlyLeave = $derived(
		activeSession
			? isPlayerEarlyLeave(
					session?.my_membership?.status ?? preview?.my_membership?.status ?? null,
					activeSession.status,
					session?.my_pending_leave
						? 'pending'
						: session?.my_membership?.status === 'left'
							? 'approved'
							: null
				)
			: false
	);
	const title = $derived(activeSession?.name ?? t('sessions.detail.title'));
	const hasLocation = $derived(
		activeSession?.latitude !== null &&
			activeSession?.latitude !== undefined &&
			activeSession?.longitude !== null &&
			activeSession?.longitude !== undefined
	);

	const distanceLabel = $derived.by(() => {
		if (!browser || !hasLocation || !activeSession) return null;
		const userLocation = loadStoredUserLocation();
		if (!userLocation) return null;

		return formatDistanceKm(
			haversineDistanceKm(
				userLocation.latitude,
				userLocation.longitude,
				activeSession.latitude!,
				activeSession.longitude!
			)
		);
	});

	const googleMapsUrl = $derived(
		hasLocation && activeSession
			? mapsSearchUrl(activeSession.latitude!, activeSession.longitude!)
			: null
	);
	const appleMapsUrl = $derived(
		hasLocation && activeSession
			? appleMapsSearchUrl(activeSession.latitude!, activeSession.longitude!)
			: null
	);

	const membership = $derived(session?.my_membership ?? preview?.my_membership ?? null);
	const rosterReady = $derived(
		session?.waiting_players !== undefined &&
			session?.queued_players !== undefined &&
			session?.confirmed_players !== undefined
	);
	const waitingPlayers = $derived(session?.waiting_players ?? []);
	const queuedPlayers = $derived(session?.queued_players ?? []);
	const confirmedPlayers = $derived(session?.confirmed_players ?? []);
	const showParticipants = $derived(
		rosterReady &&
			session &&
			(membership !== null ||
				session.status === 'open' ||
				session.status === 'in_progress' ||
				waitingPlayers.length > 0 ||
				queuedPlayers.length > 0 ||
				confirmedPlayers.length > 0)
	);
	const canJoin = $derived(
		session &&
			!membership &&
			!session.has_outstanding_fee &&
			!session.join_conflict &&
			(session.status === 'open' || session.status === 'in_progress') &&
			Date.now() <
				new Date(session.end_at).getTime() - SESSION_JOIN_CLOSE_LEAD_MINUTES * 60 * 1000
	);
	const showJoinConflict = $derived(
		session?.join_conflict &&
			!membership &&
			!session.has_outstanding_fee &&
			(session.status === 'open' || session.status === 'in_progress') &&
			Date.now() <
				new Date(session.end_at).getTime() - SESSION_JOIN_CLOSE_LEAD_MINUTES * 60 * 1000
	);
	const joinConflictMessage = $derived.by(() => {
		const conflict = session?.join_conflict;
		if (!conflict) return null;

		if (conflict.kind === 'too_soon_after_live') {
			return t('sessions.detail.joinConflictLiveBuffer', {
				sessionName: conflict.session_name,
				endAt: formatDateTime(conflict.end_at),
				hours: LIVE_SESSION_JOIN_BUFFER_HOURS
			});
		}

		return t('sessions.detail.joinConflictOverlap', {
			phrase: joinConflictMembershipPhrase(conflict.membership_status),
			sessionName: conflict.session_name,
			startAt: formatDateTime(conflict.start_at),
			endAt: formatDateTime(conflict.end_at)
		});
	});
	const isInProgressJoin = $derived(session?.status === 'in_progress');
	const estimatedCourtShare = $derived(
		isInProgressJoin ? (session?.estimated_join_court_share ?? null) : null
	);
	const estimatedCourtSharePlayerCount = $derived.by(() => {
		if (!isInProgressJoin || session?.billing_active_player_count === null) return null;
		if (session?.billing_active_player_count === undefined) return null;
		return session.billing_active_player_count + 1;
	});
	const isWithinCancelLockWindow = $derived(
		session
			? Date.now() >=
					new Date(session.start_at).getTime() - SESSION_CANCEL_LOCK_LEAD_MINUTES * 60 * 1000
			: false
	);
	const canCancel = $derived(
		session?.status !== 'in_progress' &&
			(membership?.status === 'queued' ||
				(membership?.status === 'waiting' && !isWithinCancelLockWindow))
	);
	const cancelJoinLocked = $derived(
		session?.status !== 'in_progress' &&
			membership?.status === 'waiting' &&
			isWithinCancelLockWindow
	);
	const isLateCancelWindow = $derived(
		session ? Date.now() >= new Date(session.start_at).getTime() - 60 * 60 * 1000 : false
	);
	const requiresLateCancelFee = $derived(
		membership?.status === 'waiting' && (session?.cancellation_fee ?? 0) > 0 && isLateCancelWindow
	);
	const canLeave = $derived(
		membership?.status === 'confirmed' && session?.status === 'in_progress'
	);
	const hasActiveMembership = $derived(
		membership !== null &&
			(membership.status === 'waiting' ||
				membership.status === 'queued' ||
				membership.status === 'confirmed')
	);

	const goToLiveSession = () => {
		if (!session || liveNavLoading) return;
		const id = session.id;
		liveNavLoading = true;
		void goto(liveSessionHref(id))
			.then(() => close())
			.finally(() => {
				liveNavLoading = false;
			});
	};

	const spotsLabel = $derived.by(() => {
		if (!session) return null;
		return t('sessions.detail.spotsLabel', {
			waiting: session.waiting_count,
			max: session.max_players,
			queued: session.queued_count,
			buffer: session.max_buffer
		});
	});

	const shuttleSharePerUse = $derived.by(() => {
		if (!session) return 0;
		return computePlayerShuttleShare(1, session.shuttle_price_per_each);
	});

	const courtFeeHint = $derived.by(() => {
		if (!session) return '';
		return session.court_count === 1
			? t('sessions.detail.courtFeeHint', { count: session.court_count })
			: t('sessions.detail.courtFeeHintPlural', { count: session.court_count });
	});

	const shuttleHintText = $derived.by(() => {
		if (!session) return '';
		const price = formatThb(session.shuttle_price_per_each);
		return session.shuttle?.name
			? t('sessions.detail.shuttleHintNamed', { name: session.shuttle.name, price })
			: t('sessions.detail.shuttleHint', { price });
	});

	const joinInProgressEstimate = $derived.by(() => {
		if (!session || estimatedCourtShare === null) return '';
		let suffix = t('sessions.detail.joinInProgressEstimate', {
			amount: formatThb(estimatedCourtShare)
		});
		if (
			session.fixed_court_fee_per_player === null &&
			estimatedCourtSharePlayerCount !== null
		) {
			suffix +=
				estimatedCourtSharePlayerCount === 1
					? t('sessions.detail.joinInProgressSplitOne', {
							count: estimatedCourtSharePlayerCount
						})
					: t('sessions.detail.joinInProgressSplitMany', {
							count: estimatedCourtSharePlayerCount
						});
		}
		return suffix;
	});

	const detailReady = $derived(!loading);

	const refreshSessionDetail = async () => {
		if (!sessionId) return;
		const response = await fetch(`/api/sessions/${sessionId}`);
		if (response.ok) {
			session = (await response.json()) as SessionDetail;
		}
	};

	const enhanceAction =
		(closeOnSuccess = false): SubmitFunction =>
		() => {
			actionLoading = true;
			return async ({ result }) => {
				actionLoading = false;

				if (result.type === 'success') {
					const data = result.data as { message?: string } | undefined;
					if (data?.message) toast.success(data.message);
					joinModalOpen = false;
					await invalidate('app:sessions');
					await refreshSessionDetail();
					if (closeOnSuccess) {
						close();
					}
					return;
				}

				if (result.type === 'failure') {
					const data = result.data as { message?: string } | undefined;
					toast.error(data?.message ?? t('toast.genericError'));
					return;
				}

				if (result.type === 'error') {
					toast.error(t('toast.genericError'));
				}
			};
		};

	const enhanceCancel: SubmitFunction = () => {
		actionLoading = true;
		return async ({ result }) => {
			actionLoading = false;
			cancelConfirmOpen = false;

			if (result.type === 'success') {
				const data = result.data as {
					message?: string;
					feeOwed?: number;
					playerId?: string;
					feeStatus?: 'owed' | 'submitted';
				};
				if (data?.message) toast.success(data.message);
				await invalidate('app:sessions');

				if ((data?.feeOwed ?? 0) > 0 && data.playerId) {
					feeModalPlayerId = data.playerId;
					feeModalAmount = data.feeOwed ?? 0;
					feeModalStatus = data.feeStatus === 'submitted' ? 'submitted' : 'owed';
					feeModalOpen = true;
					if (sessionId) {
						await refreshSessionDetail();
					}
					return;
				}

				close();
				return;
			}

			if (result.type === 'failure') {
				const data = result.data as { message?: string } | undefined;
				toast.error(data?.message ?? t('toast.genericError'));
			} else if (result.type === 'error') {
				toast.error(t('toast.genericError'));
			}
		};
	};

	const closeFeeModal = () => {
		feeModalOpen = false;
		feeModalPlayerId = null;
		close();
	};

	const onFeeSubmitted = async () => {
		feeModalStatus = 'submitted';
		toast.success(t('toast.paymentSubmitted'));
		await invalidate('app:sessions');
	};

	$effect(() => {
		if (!browser || !show || activeSession?.status !== 'in_progress') return;

		const timer = window.setInterval(() => {
			nowMs = Date.now();
		}, 1_000);

		return () => window.clearInterval(timer);
	});

	$effect(() => {
		if (!browser) return;

		if (!open || !sessionId) {
			visible = false;
			joinModalOpen = false;
			cancelConfirmOpen = false;
			feeModalOpen = false;
			resetDrag();
			const timer = window.setTimeout(() => {
				show = false;
				session = null;
				loadError = null;
				loading = false;
			}, 240);
			return () => window.clearTimeout(timer);
		}

		show = true;
		resetDrag();
		loadError = null;
		session = preview as SessionDetail | null;
		loading = true;

		const frame = window.requestAnimationFrame(() => {
			visible = true;
		});

		let cancelled = false;

		fetch(`/api/sessions/${sessionId}`)
			.then(async (response) => {
				if (!response.ok) {
					const message =
						response.status === 404 ? t('sessions.detail.notFound') : t('sessions.detail.loadError');
					throw new Error(message);
				}
				return response.json() as Promise<SessionDetail>;
			})
			.then((detail) => {
				if (cancelled) return;
				session = detail;
			})
			.catch((err) => {
				if (cancelled) return;
				loadError = err instanceof Error ? err.message : t('sessions.detail.loadError');
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});

		return () => {
			cancelled = true;
			window.cancelAnimationFrame(frame);
		};
	});

	$effect(() => {
		if (!browser || !open || !sessionId || !visible || !hasActiveMembership) {
			lastPolledSessionStatus = null;
			lastPolledMembershipStatus = null;
			return;
		}

		let navigating = false;

		const pollSession = async () => {
			if (navigating || !sessionId) return;

			try {
				const response = await fetch(`/api/sessions/${sessionId}`);
				if (!response.ok) return;

				const detail = (await response.json()) as SessionDetail;
				const previousStatus = lastPolledSessionStatus ?? session?.status ?? detail.status;
				const membershipForNav = detail.my_membership;
				const previousMembershipStatus =
					lastPolledMembershipStatus ?? membership?.status ?? membershipForNav?.status ?? null;
				lastPolledSessionStatus = detail.status;
				lastPolledMembershipStatus = membershipForNav?.status ?? null;
				session = detail;

				if (
					membershipForNav &&
					shouldOpenLiveSession({
						status: detail.status,
						my_membership: membershipForNav
					}) &&
					(
						(previousStatus !== 'in_progress' && detail.status === 'in_progress') ||
						(detail.status === 'in_progress' &&
							previousMembershipStatus !== 'confirmed' &&
							membershipForNav.status === 'confirmed')
					)
				) {
					navigating = true;
					close();
					goto(liveSessionHref(sessionId));
				}
			} catch {
				// ponytail: poll failure is transient; next interval retries
			}
		};

		lastPolledSessionStatus = session?.status ?? null;
		lastPolledMembershipStatus = membership?.status ?? null;
		void pollSession();

		const pollIntervalMs = () => {
			if (!session) return 15_000;
			const msToStart = new Date(session.start_at).getTime() - Date.now();
			if (msToStart <= 60_000) return 2_000;
			if (msToStart <= 5 * 60_000) return 5_000;
			return 15_000;
		};

		const timer = window.setInterval(pollSession, pollIntervalMs());

		return () => {
			window.clearInterval(timer);
			lastPolledSessionStatus = null;
			lastPolledMembershipStatus = null;
		};
	});

	$effect(() => {
		if (!browser || !show) return;

		const scrollEl = document.querySelector('.app-scroll');
		const previousOverflow =
			scrollEl instanceof HTMLElement ? scrollEl.style.overflow : undefined;

		if (scrollEl instanceof HTMLElement) {
			scrollEl.style.overflow = 'hidden';
		}

		window.addEventListener('keydown', onKeydown);

		return () => {
			window.removeEventListener('keydown', onKeydown);

			if (scrollEl instanceof HTMLElement) {
				scrollEl.style.overflow = previousOverflow ?? '';
			}
		};
	});
</script>

{#if browser && show}
	<div use:portal class="bottom-sheet-root" class:bottom-sheet-root--open={visible}>
		<button
			type="button"
			class="bottom-sheet-backdrop"
			aria-label={t('sessions.detail.closeAria')}
			style:opacity={backdropOpacity}
			onclick={close}
		></button>

		<div
			bind:this={panelEl}
			class="bottom-sheet-panel"
			class:bottom-sheet-panel--open={visible && dragOffset === 0}
			class:bottom-sheet-panel--dragging={dragging}
			style:transform={panelTransform}
			role="dialog"
			aria-modal="true"
			aria-labelledby="session-sheet-title"
		>
			<div
				class="bottom-sheet-drag-handle flex shrink-0 justify-center pt-3 pb-2"
				role="button"
				tabindex="-1"
				aria-label={t('common.dragToClose')}
				onpointerdown={onDragStart}
				onpointermove={onDragMove}
				onpointerup={onDragEnd}
				onpointercancel={onDragEnd}
			>
				<div class="h-1 w-10 rounded-full bg-slate-300" aria-hidden="true"></div>
			</div>

			<div class="flex shrink-0 items-start justify-between gap-3 pb-3">
				<div class="min-w-0">
					<h2 id="session-sheet-title" class="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
					{#if activeSession?.club?.name}
						<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">{activeSession.club.name}</p>
					{/if}
					{#if activeSession?.status}
						<p class="mt-2 flex flex-wrap items-center gap-2">
							<span
								class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {sessionStatusBadgeClass(activeSession.status)}"
							>
								{sessionStatusLabel(activeSession.status)}
							</span>
							{#if playerEarlyLeave}
								<span
									class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-100 text-rose-800 ring-1 ring-rose-200"
								>
									{t('sessions.playerStatus.earlyLeaved')}
								</span>
							{:else if sessionEnded}
								<span
									class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-100 text-rose-800 ring-1 ring-rose-200"
								>
									{t('sessions.detail.endedBadge')}
								</span>
							{/if}
						</p>
					{/if}
					{#if distanceLabel}
						<p class="mt-1 text-sm font-medium text-brand-700">{t('sessions.detail.away', { distance: distanceLabel })}</p>
					{/if}
				</div>
				<button
					type="button"
					class="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-700 dark:text-slate-300 dark:text-slate-600"
					onclick={close}
				>
					{t('common.close')}
				</button>
			</div>

			{#if activeSession?.start_at && activeSession.status === 'open'}
				<div class="pb-3">
					<SessionStartCountdown startAt={activeSession.start_at} showUntilStart />
				</div>
			{/if}

			{#if activeSession?.start_at && activeSession.status === 'in_progress'}
				<div class="space-y-3 pb-3">
					<SessionLiveTimers
						startAt={activeSession.start_at}
						endAt={activeSession.end_at}
						showRemaining={!sessionEnded}
						showOverdue={sessionEnded}
						variant="banner"
					/>
					{#if sessionEnded && !playerEarlyLeave}
						<p class="rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2.5 text-sm text-rose-900">
							{t('sessions.detail.sessionEndedBanner')}
						</p>
					{/if}
				</div>
			{/if}

			<div class="min-h-0 flex-1 overflow-y-auto pb-6" aria-busy={loading}>
				{#if loadError && !activeSession}
					<p class="mt-3 text-sm text-red-600">{loadError}</p>
				{:else}
					{#if loadError}
						<p class="mt-3 text-sm text-red-600">{loadError}</p>
					{/if}

					{#if membership && activeSession}
						<div class="mt-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
							<div class="flex items-start justify-between gap-4">
								<div class="min-w-0">
									<p class="app-cost-line-label text-brand-900">{t('sessions.detail.yourStatus')}</p>
									{#if detailReady && session}
										{#if membership.status === 'waiting'}
											{#if session.status === 'in_progress'}
												<p class="app-cost-line-hint text-brand-700">
													{t('sessions.detail.waitingInProgress')}
												</p>
											{:else if isWithinCancelLockWindow}
												<p class="app-cost-line-hint text-brand-700">
													{t('sessions.detail.waitingCancelLocked')}
												</p>
											{:else}
												<p class="app-cost-line-hint text-brand-700">
													{t('sessions.detail.waitingBeforeStart')}
												</p>
											{/if}
										{:else if membership.status === 'confirmed'}
											{#if session.status === 'in_progress'}
												<p class="app-cost-line-hint text-brand-700">
													{t('sessions.detail.confirmedLive')}
												</p>
											{:else}
												<p class="app-cost-line-hint text-brand-700">
													{t('sessions.detail.confirmedUpcoming', {
														startAt: formatDateTime(session.start_at)
													})}
												</p>
											{/if}
										{/if}
									{/if}
								</div>
								<p class="app-cost-line-amount shrink-0 text-brand-800">
									{sessionPlayerStatusLabel(membership.status)}
								</p>
							</div>
						</div>
					{/if}

					{#if detailReady && session?.has_outstanding_fee}
						<p class="mt-3 text-sm text-amber-800">
							{t('sessions.detail.outstandingFee')}
						</p>
					{/if}

					{#if detailReady && showJoinConflict && joinConflictMessage}
						<p class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
							{joinConflictMessage}
						</p>
					{/if}

					{#if loading && !activeSession?.description}
						<div class="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4" aria-hidden="true">
							<div class="app-skeleton h-5 w-16"></div>
							<div class="app-skeleton mt-3 h-16 w-full"></div>
						</div>
					{:else if activeSession?.description}
						<div class="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
							<h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">{t('common.about')}</h3>
							<RichTextDisplay
								html={activeSession.description}
								class="prose prose-sm mt-3 max-w-none text-sm leading-relaxed text-slate-600 dark:text-slate-400 dark:text-slate-500"
							/>
						</div>
					{/if}

					<div class="mt-6 space-y-4">
						{#if loading && !activeSession?.start_at}
							<div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4" aria-hidden="true">
								<div class="app-skeleton h-5 w-24"></div>
								<div class="app-skeleton mt-3 h-10 w-full max-w-xs"></div>
								<div class="mt-3 space-y-2 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
									<div class="app-skeleton h-4 w-32"></div>
									<div class="app-skeleton h-3 w-40"></div>
								</div>
							</div>
						{:else if activeSession?.start_at && activeSession.end_at}
							<div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
								<h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">{t('common.schedule')}</h3>
								<SessionDurationPill
									startAt={activeSession.start_at}
									endAt={activeSession.end_at}
									class="mt-3"
								/>
								<div class="app-cost-lines mt-3 rounded-xl border border-slate-100 dark:border-slate-800">
									<div class="app-cost-line">
										<div class="min-w-0">
											<p class="app-cost-line-label">{t('common.start')}</p>
											<p class="app-cost-line-hint">{t('sessions.detail.sessionBegins')}</p>
										</div>
										<p class="app-cost-line-amount">{formatDateTime(activeSession.start_at)}</p>
									</div>
									<div class="app-cost-line">
										<div class="min-w-0">
											<p class="app-cost-line-label">{t('common.end')}</p>
											<p class="app-cost-line-hint">{t('sessions.detail.scheduledFinish')}</p>
										</div>
										<p class="app-cost-line-amount">{formatDateTime(activeSession.end_at)}</p>
									</div>
								</div>
							</div>
						{/if}

						<div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4" aria-busy={loading}>
							<h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">{t('common.venue')}</h3>
							{#if loading && !activeSession?.venue_name && !hasLocation}
								<div class="mt-3 space-y-2 rounded-xl border border-slate-100 dark:border-slate-800 p-3" aria-hidden="true">
									<div class="app-skeleton h-4 w-32"></div>
									<div class="app-skeleton h-3 w-40"></div>
								</div>
							{:else}
								<div class="app-cost-lines mt-3 rounded-xl border border-slate-100 dark:border-slate-800">
									<div class="app-cost-line">
										<div class="min-w-0">
											<p class="app-cost-line-label">{t('sessions.detail.location')}</p>
											{#if activeSession?.venue_name}
												<p class="app-cost-line-hint">{t('sessions.detail.locationSet')}</p>
											{:else}
												<p class="app-cost-line-hint">{t('sessions.detail.locationNotSet')}</p>
											{/if}
										</div>
										<p class="app-cost-line-amount">
											{activeSession?.venue_name ?? t('common.dash')}
										</p>
									</div>
									{#if hasLocation && googleMapsUrl && appleMapsUrl}
										<div class="app-cost-line">
											<div class="min-w-0">
												<p class="app-cost-line-label">{t('common.directions')}</p>
												<p class="app-cost-line-hint">{t('sessions.detail.openInMaps')}</p>
											</div>
											<div class="app-cost-line-amount flex flex-col items-end gap-1">
												<a
													href={googleMapsUrl}
													target="_blank"
													rel="noopener noreferrer"
													class="text-sm font-semibold text-brand-700 dark:text-brand-300 hover:text-brand-800"
												>
													{t('common.googleMaps')}
												</a>
												<a
													href={appleMapsUrl}
													target="_blank"
													rel="noopener noreferrer"
													class="text-sm font-semibold text-brand-700 dark:text-brand-300 hover:text-brand-800"
												>
													{t('common.appleMaps')}
												</a>
											</div>
										</div>
									{/if}
								</div>
							{/if}
						</div>

						<div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4" aria-busy={loading}>
							<h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">{t('sessions.detail.capacityFees')}</h3>
							{#if loading}
								<div class="mt-3 space-y-3" aria-hidden="true">
									<div class="flex justify-between gap-4">
										<div class="app-skeleton h-4 w-20"></div>
										<div class="app-skeleton h-4 w-28"></div>
									</div>
									<div class="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
										<div class="app-skeleton h-4 w-32"></div>
										<div class="app-skeleton h-3 w-48"></div>
									</div>
									<div class="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
										<div class="app-skeleton h-4 w-24"></div>
										<div class="app-skeleton h-3 w-40"></div>
									</div>
								</div>
							{:else if session}
								<div class="app-cost-lines mt-3 rounded-xl border border-slate-100 dark:border-slate-800">
									{#if spotsLabel}
										<div class="app-cost-line">
											<div class="min-w-0">
												<p class="app-cost-line-label">{t('sessions.detail.availability')}</p>
												<p class="app-cost-line-hint">
													{t('sessions.detail.availabilityHint')}
												</p>
											</div>
											<p class="app-cost-line-amount">{spotsLabel}</p>
										</div>
									{/if}
									{#if session.fixed_court_fee_per_player === null}
										<div class="app-cost-line">
											<div class="min-w-0">
												<p class="app-cost-line-label">{t('sessions.detail.courtFee')}</p>
												<p class="app-cost-line-hint">
													{courtFeeHint}
												</p>
											</div>
											<p class="app-cost-line-amount">
												{t('sessions.detail.courtFeePerHour', {
													amount: formatThb(session.court_fee_per_hour)
												})}
											</p>
										</div>
										<div class="app-cost-line">
											<div class="min-w-0">
												<p class="app-cost-line-label">
													{t('sessions.detail.courtFeePerPlayer', {
														mode: courtFeePerPlayerModeLabel(null)
													})}
												</p>
												<p class="app-cost-line-hint">{courtFeePerPlayerModeHint(null)}</p>
											</div>
										</div>
									{:else}
										<div class="app-cost-line">
											<div class="min-w-0">
												<p class="app-cost-line-label">
													{t('sessions.detail.courtFeePerPlayer', {
														mode: courtFeePerPlayerModeLabel(
															session.fixed_court_fee_per_player
														)
													})}
												</p>
												<p class="app-cost-line-hint">
													{courtFeePerPlayerModeHint(session.fixed_court_fee_per_player)}
												</p>
											</div>
											<p class="app-cost-line-amount">
												{formatThb(session.fixed_court_fee_per_player)}
											</p>
										</div>
									{/if}

									<div class="app-cost-line">
										<div class="min-w-0">
											<p class="app-cost-line-label">{t('sessions.detail.shuttle')}</p>
											<p class="app-cost-line-hint">
												{shuttleHintText}
											</p>
										</div>
										<p class="app-cost-line-amount">
											{formatThb(shuttleSharePerUse)}
											<span class="block text-xs font-normal text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('sessions.detail.perShuttle')}</span>
										</p>
									</div>

									<div class="app-cost-line">
										<div class="min-w-0">
											<p class="app-cost-line-label">{t('sessions.detail.lateCancelFee')}</p>
											<p class="app-cost-line-hint">
												{#if session.cancellation_fee > 0}
													{t('sessions.detail.lateCancelWithinHour')}
												{:else}
													{t('sessions.detail.lateCancelNone')}
												{/if}
											</p>
										</div>
										<p class="app-cost-line-amount">
											{#if session.cancellation_fee > 0}
												{formatThb(session.cancellation_fee)}
											{:else}
												{t('sessions.detail.noFee')}
											{/if}
										</p>
									</div>
								</div>
							{/if}
						</div>

						{#if loading && !activeSession?.match_score_type}
							<div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4" aria-hidden="true">
								<div class="app-skeleton h-5 w-32"></div>
								<div class="mt-3 space-y-2 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
									<div class="app-skeleton h-4 w-28"></div>
									<div class="app-skeleton h-3 w-36"></div>
								</div>
							</div>
						{:else if activeSession?.match_score_type}
							<div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
								<h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">{t('sessions.detail.matchSettings')}</h3>
								<div class="app-cost-lines mt-3 rounded-xl border border-slate-100 dark:border-slate-800">
									<div class="app-cost-line">
										<div class="min-w-0">
											<p class="app-cost-line-label">{t('sessions.detail.rallyPoints')}</p>
											<p class="app-cost-line-hint">{t('sessions.detail.rallyPointsHint')}</p>
										</div>
										<p class="app-cost-line-amount">{activeSession.match_score_type}</p>
									</div>
									<div class="app-cost-line">
										<div class="min-w-0">
											<p class="app-cost-line-label">{t('sessions.detail.matchFormat')}</p>
											<p class="app-cost-line-hint">{t('sessions.detail.matchFormatHint')}</p>
										</div>
										<p class="app-cost-line-amount">
											{matchTypeLabel(activeSession.match_type)}
										</p>
									</div>
								</div>
							</div>
						{/if}

						{#if loading}
							<div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4" aria-busy="true">
								<h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">{t('common.host')}</h3>
								<div class="mt-3 space-y-2 rounded-xl border border-slate-100 dark:border-slate-800 p-3" aria-hidden="true">
									<div class="app-skeleton h-4 w-32"></div>
									<div class="app-skeleton h-3 w-24"></div>
								</div>
							</div>
						{:else if session?.host}
							<div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
								<h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">{t('common.host')}</h3>
								<div class="app-cost-lines mt-3 rounded-xl border border-slate-100 dark:border-slate-800">
									<div class="app-cost-line">
										<div class="min-w-0">
											<p class="app-cost-line-label">{t('sessions.detail.sessionHost')}</p>
											<p class="app-cost-line-hint">{t('sessions.detail.organizing')}</p>
										</div>
										<div class="app-cost-line-amount flex flex-col items-end gap-1">
											<span>{session.host.display_name}</span>
											{#if session.host.tag}
												<TagPill tag={session.host.tag} />
											{/if}
										</div>
									</div>
								</div>
							</div>
						{/if}

						{#if loading || !rosterReady}
							<div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4" aria-busy="true">
								<h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">{t('sessions.detail.participants')}</h3>
								<p class="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
									{t('sessions.detail.participantsHint')}
								</p>
								<ul
									class="mt-4 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800"
									aria-label={t('sessions.detail.loadingParticipants')}
								>
									{#each [0, 1, 2] as row (row)}
										<li class="flex items-center gap-3 bg-white dark:bg-slate-900 px-3 py-2.5">
											<div class="app-skeleton h-9 w-9 shrink-0 rounded-full"></div>
											<div class="min-w-0 flex-1 space-y-2">
												<div class="app-skeleton h-4 w-32 max-w-full"></div>
												<div class="app-skeleton h-3 w-24 max-w-full"></div>
											</div>
										</li>
									{/each}
								</ul>
							</div>
						{:else if showParticipants && session}
							<div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
								<h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">{t('sessions.detail.participants')}</h3>
								<p class="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
									{t('sessions.detail.participantsHint')}
								</p>

								<div class="app-cost-lines mt-3 rounded-xl border border-slate-100 dark:border-slate-800">
									<div>
										<div class="app-cost-line">
											<div class="min-w-0">
												<p class="app-cost-line-label">{t('sessions.detail.waitingList')}</p>
												<p class="app-cost-line-hint">{t('sessions.detail.awaitingConfirmation')}</p>
											</div>
											<p class="app-cost-line-amount">{waitingPlayers.length}</p>
										</div>
										{#if waitingPlayers.length === 0}
											<p class="border-t border-slate-100 dark:border-slate-800 px-4 py-3 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
												{t('sessions.detail.noPlayersWaiting')}
											</p>
										{:else}
											<ul class="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
												{#each waitingPlayers as player (player.id)}
													<li class="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2.5">
														<UserAvatar
															displayName={player.profile?.display_name ?? t('common.player')}
															avatarUrl={player.profile?.avatar_url ?? null}
															size="sm"
														/>
														<div class="min-w-0 flex-1">
															<p class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
																{player.profile?.display_name ?? t('common.unknownPlayer')}
																{#if player.is_me}
																	<span class="text-brand-700">{t('common.youParen')}</span>
																{/if}
															</p>
															<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
																{t('sessions.detail.joinedAt', { date: formatDateTime(player.joined_at) })}
															</p>
														</div>
														{#if player.profile?.tag}
															<TagPill tag={player.profile.tag} />
														{/if}
													</li>
												{/each}
											</ul>
										{/if}
									</div>

									<div>
										<div class="app-cost-line">
											<div class="min-w-0">
												<p class="app-cost-line-label">{t('sessions.detail.bufferQueue')}</p>
												<p class="app-cost-line-hint">
													{t('sessions.detail.bufferQueueHint', { max: session.max_buffer })}
												</p>
											</div>
											<p class="app-cost-line-amount">
												{queuedPlayers.length}/{session.max_buffer}
											</p>
										</div>
										{#if queuedPlayers.length === 0}
											<p class="border-t border-slate-100 dark:border-slate-800 px-4 py-3 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
												{t('sessions.detail.noPlayersInBuffer')}
											</p>
										{:else}
											<ul class="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
												{#each queuedPlayers as player (player.id)}
													<li class="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2.5">
														<UserAvatar
															displayName={player.profile?.display_name ?? t('common.player')}
															avatarUrl={player.profile?.avatar_url ?? null}
															size="sm"
														/>
														<div class="min-w-0 flex-1">
															<p class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
																{player.profile?.display_name ?? t('common.unknownPlayer')}
																{#if player.is_me}
																	<span class="text-brand-700">{t('common.youParen')}</span>
																{/if}
															</p>
															<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
																{t('sessions.detail.joinedAt', { date: formatDateTime(player.joined_at) })}
															</p>
														</div>
														{#if player.profile?.tag}
															<TagPill tag={player.profile.tag} />
														{/if}
													</li>
												{/each}
											</ul>
										{/if}
									</div>

									<div>
										<div class="app-cost-line">
											<div class="min-w-0">
												<p class="app-cost-line-label">{t('sessions.detail.confirmedLabel')}</p>
												<p class="app-cost-line-hint">{t('sessions.detail.approvedToPlay')}</p>
											</div>
											<p class="app-cost-line-amount">{confirmedPlayers.length}</p>
										</div>
										{#if confirmedPlayers.length === 0}
											<p class="border-t border-slate-100 dark:border-slate-800 px-4 py-3 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
												{t('sessions.detail.noConfirmed')}
											</p>
										{:else}
											<ul class="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
												{#each confirmedPlayers as player (player.id)}
													<li class="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2.5">
														<UserAvatar
															displayName={player.profile?.display_name ?? t('common.player')}
															avatarUrl={player.profile?.avatar_url ?? null}
															size="sm"
														/>
														<div class="min-w-0 flex-1">
															<p class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
																{player.profile?.display_name ?? t('common.unknownPlayer')}
																{#if player.is_me}
																	<span class="text-brand-700">{t('common.youParen')}</span>
																{/if}
															</p>
															<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('sessions.detail.confirmedPlayer')}</p>
														</div>
														{#if player.profile?.tag}
															<TagPill tag={player.profile.tag} />
														{/if}
													</li>
												{/each}
											</ul>
										{/if}
									</div>
								</div>
							</div>
						{/if}
					</div>

					<div class="mt-6 space-y-3">
						{#if loading}
							<div class="app-skeleton h-12 w-full rounded-xl" aria-hidden="true"></div>
						{:else if session}
							{#if canJoin}
								<SubmitButton type="button" variant="accent" onclick={() => (joinModalOpen = true)}>
									{t('actions.joinSession')}
								</SubmitButton>
							{:else if showJoinConflict}
								<SubmitButton type="button" disabled>{t('actions.joinSession')}</SubmitButton>
							{/if}

							{#if canCancel}
								<SubmitButton
									type="button"
									variant="secondary"
									onclick={() => {
										if (requiresLateCancelFee) {
											cancelConfirmOpen = true;
										} else {
											const form = document.getElementById('cancel-membership-form') as HTMLFormElement | null;
											form?.requestSubmit();
										}
									}}
									loading={actionLoading}
								>
									{t('sessions.detail.cancelJoin')}
								</SubmitButton>
								<form
									id="cancel-membership-form"
									method="POST"
									action="/sessions?/cancel"
									class="hidden"
									use:enhance={enhanceCancel}
								>
									<input type="hidden" name="session_id" value={session.id} />
								</form>
								{#if membership?.status === 'waiting' && session.cancellation_fee > 0}
									<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
										{t('sessions.detail.cancelWithinHourHint', {
											amount: formatThb(session.cancellation_fee)
										})}
									</p>
								{/if}
							{/if}

							{#if cancelJoinLocked}
								<SubmitButton type="button" variant="secondary" disabled>
									{t('sessions.detail.cancelJoin')}
								</SubmitButton>
								<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
									{t('sessions.detail.cancelJoinLockedBody', {
										mode: courtFeePerPlayerModeLabel(
											session.fixed_court_fee_per_player
										).toLowerCase()
									})}
								</p>
							{/if}

							{#if canLeave}
								<SubmitButton
									type="button"
									variant="secondary"
									onclick={goToLiveSession}
									loading={liveNavLoading}
									loadingLabel={t('common.opening')}
								>
									{t('sessions.detail.leaveSession')}
								</SubmitButton>
								<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
									{t('sessions.detail.leaveSessionHint')}
								</p>
							{:else if session.status === 'in_progress' && membership?.status === 'confirmed'}
								<SubmitButton
									type="button"
									variant="accent"
									onclick={goToLiveSession}
									loading={liveNavLoading}
									loadingLabel={t('common.opening')}
								>
									{t('sessions.detail.openLiveSession')}
								</SubmitButton>
							{/if}
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>

	{#if joinModalOpen && session}
		<AppModal open={joinModalOpen} labelledBy="join-session-title" onClose={closeJoinModal}>
			<div class="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-xl">
				<div class="border-b border-brand-100 bg-brand-50 px-4 py-4">
					<h2 id="join-session-title" class="text-lg font-semibold text-brand-900">
						{isInProgressJoin
							? t('sessions.detail.joinInProgressTitle')
							: t('sessions.detail.beforeYouJoin')}
					</h2>
					<div class="mt-3 space-y-3 text-sm text-brand-800">
						{#if isInProgressJoin}
							<p>{t('sessions.detail.alreadyStarted')}</p>
							<p>
								{t('sessions.detail.joinInProgressNoCancel', {
									mode: courtFeePerPlayerModeLabel(
										session.fixed_court_fee_per_player
									).toLowerCase(),
									estimate: joinInProgressEstimate
								})}
							</p>
							<p>
								{t('sessions.detail.unpaidFeesBlock')}
							</p>
						{:else}
							<p>
								{t('sessions.detail.arriveEarly', {
									startAt: formatDateTime(session.start_at)
								})}
							</p>
							<p>
								{t('sessions.detail.cancelPolicy')}
							</p>
							{#if session.cancellation_fee > 0}
								<p>
									{t('sessions.detail.cancelBodyFee', {
										amount: formatThb(session.cancellation_fee)
									})}
								</p>
							{/if}
						{/if}
					</div>
				</div>
				<form
					method="POST"
					action="/sessions?/join"
					class="flex flex-wrap gap-2 p-4"
					use:enhance={enhanceAction()}
				>
					<input type="hidden" name="session_id" value={session.id} />
					<SubmitButton loading={actionLoading} loadingLabel={t('common.joining')} variant="accent" class="!w-auto">
						{t('actions.joinSession')}
					</SubmitButton>
					<SubmitButton
						type="button"
						variant="secondary"
						class="!w-auto"
						disabled={actionLoading}
						onclick={closeJoinModal}
					>
						{t('common.cancel')}
					</SubmitButton>
				</form>
			</div>
		</AppModal>
	{/if}

	{#if cancelConfirmOpen && session}
		<AppModal open={cancelConfirmOpen} labelledBy="cancel-confirm-title" onClose={() => (cancelConfirmOpen = false)}>
			<div class="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-xl">
				<div class="border-b border-amber-100 bg-amber-50 px-4 py-4">
					<h2 id="cancel-confirm-title" class="text-lg font-semibold text-amber-900">
						{t('sessions.detail.lateCancelConfirmTitle')}
					</h2>
					<p class="mt-3 text-sm text-amber-900">
						{t('sessions.detail.lateCancelConfirmBodyFull', {
							amount: formatThb(session.cancellation_fee)
						})}
					</p>
				</div>
				<form
					method="POST"
					action="/sessions?/cancel"
					class="flex flex-wrap gap-2 p-4"
					use:enhance={enhanceCancel}
				>
					<input type="hidden" name="session_id" value={session.id} />
					<SubmitButton loading={actionLoading} loadingLabel={t('common.cancelling')} class="!w-auto">
						{t('sessions.detail.acceptAndCancel')}
					</SubmitButton>
					<SubmitButton
						type="button"
						variant="secondary"
						class="!w-auto"
						disabled={actionLoading}
						onclick={() => (cancelConfirmOpen = false)}
					>
						{t('sessions.detail.keepMySpot')}
					</SubmitButton>
				</form>
			</div>
		</AppModal>
	{/if}

	{#if feeModalOpen && feeModalPlayerId && session}
		<CancellationFeeModal
			open={feeModalOpen}
			playerId={feeModalPlayerId}
			amount={feeModalAmount}
			promptpayTarget={session.promptpay_target}
			feeStatus={feeModalStatus}
			sessionLabel="{session.name} · {session.club?.name ?? t('sessions.detail.clubSessionFallback')}"
			onClose={closeFeeModal}
			onSubmitted={onFeeSubmitted}
		/>
	{/if}
{/if}
