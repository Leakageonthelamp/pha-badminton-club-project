<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';
	import RichTextDisplay from '@repo/ui/components/RichTextDisplay.svelte';
	import SessionStartCountdown from '@repo/ui/components/SessionStartCountdown.svelte';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import CancellationFeeModal from '$lib/components/CancellationFeeModal.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import { portal } from '@repo/ui/actions/portal';
	import { toast } from '@repo/ui/toast/toast.svelte';
	import {
		formatDistanceKm,
		haversineDistanceKm,
		loadStoredUserLocation,
		appleMapsSearchUrl,
		mapsSearchUrl
	} from '@repo/ui/geolocation';
	import { formatDateTime } from '@repo/ui/datetime';
	import { computeCourtShare } from '@repo/ui/payments';
	import type { SessionDetail, SessionListItem, SessionStatus } from '$lib/types/session';
	import { liveSessionHref, shouldOpenLiveSession } from '$lib/sessions/navigation';
	import { SESSION_CANCEL_LOCK_LEAD_MINUTES, SESSION_JOIN_CLOSE_LEAD_MINUTES } from '$lib/config/session';
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
	let joinModalOpen = $state(false);
	let cancelConfirmOpen = $state(false);
	let feeModalOpen = $state(false);
	let feeModalPlayerId = $state<string | null>(null);
	let feeModalAmount = $state(0);
	let feeModalStatus = $state<'owed' | 'submitted'>('owed');
	let lastPolledSessionStatus = $state<SessionStatus | null>(null);

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
	const title = $derived(activeSession?.name ?? 'Session');
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
	const canJoin = $derived(
		session &&
			!membership &&
			!session.has_outstanding_fee &&
			(session.status === 'open' || session.status === 'in_progress') &&
			Date.now() <
				new Date(session.end_at).getTime() - SESSION_JOIN_CLOSE_LEAD_MINUTES * 60 * 1000
	);
	const isInProgressJoin = $derived(session?.status === 'in_progress');
	const estimatedCourtShare = $derived.by(() => {
		if (!session || !isInProgressJoin) return null;

		const activePlayers = Math.max(session.confirmed_count + 1, 1);
		return computeCourtShare({
			courtFeePerHour: session.court_fee_per_hour,
			startAt: session.start_at,
			endAt: session.end_at,
			courtCount: session.court_count,
			activePlayers
		});
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
		if (!session) return;
		const id = session.id;
		close();
		goto(liveSessionHref(id));
	};

	const spotsLabel = $derived.by(() => {
		if (!session) return null;
		return `${session.waiting_count}/${session.max_players} spots · ${session.queued_count}/${session.max_buffer} queue`;
	});

	const shuttleLabel = $derived.by(() => {
		if (!session) return '—';
		const price = `${formatThb(session.shuttle_price_per_each)} each`;
		return session.shuttle?.name ? `${session.shuttle.name} · ${price}` : price;
	});

	const enhanceAction =
		(closeOnSuccess = false): SubmitFunction =>
		() => {
			actionLoading = true;
			return async ({ result }) => {
				actionLoading = false;

				if (result.type === 'success') {
					const data = result.data as { message?: string } | undefined;
					if (data?.message) toast.success(data.message);
					await invalidate('app:sessions');
					if (closeOnSuccess) {
						close();
						return;
					}
					if (sessionId) {
						const response = await fetch(`/api/sessions/${sessionId}`);
						if (response.ok) {
							session = (await response.json()) as SessionDetail;
						}
					}
					return;
				}

				if (result.type === 'failure') {
					const data = result.data as { message?: string } | undefined;
					toast.error(data?.message ?? 'Something went wrong.');
					return;
				}

				if (result.type === 'error') {
					toast.error('Something went wrong.');
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
						const response = await fetch(`/api/sessions/${sessionId}`);
						if (response.ok) {
							session = (await response.json()) as SessionDetail;
						}
					}
					return;
				}

				close();
				return;
			}

			if (result.type === 'failure') {
				const data = result.data as { message?: string } | undefined;
				toast.error(data?.message ?? 'Something went wrong.');
			} else if (result.type === 'error') {
				toast.error('Something went wrong.');
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
		toast.success('Payment submitted. Waiting for admin confirmation.');
		await invalidate('app:sessions');
	};

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
						response.status === 404 ? 'Session not found.' : 'Could not load session details.';
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
				loadError = err instanceof Error ? err.message : 'Could not load session details.';
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
				lastPolledSessionStatus = detail.status;
				session = detail;

				const membershipForNav = detail.my_membership;
				if (
					previousStatus !== 'in_progress' &&
					detail.status === 'in_progress' &&
					membershipForNav &&
					shouldOpenLiveSession({
						status: detail.status,
						my_membership: membershipForNav
					})
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
			aria-label="Close session details"
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
				aria-label="Drag down to close"
				onpointerdown={onDragStart}
				onpointermove={onDragMove}
				onpointerup={onDragEnd}
				onpointercancel={onDragEnd}
			>
				<div class="h-1 w-10 rounded-full bg-slate-300" aria-hidden="true"></div>
			</div>

			<div class="flex shrink-0 items-start justify-between gap-3 px-4 pb-3">
				<div class="min-w-0">
					<h2 id="session-sheet-title" class="text-xl font-semibold text-slate-900">{title}</h2>
					{#if activeSession?.club?.name}
						<p class="mt-1 text-sm text-slate-600">{activeSession.club.name}</p>
					{/if}
					{#if activeSession?.status}
						<p class="mt-2">
							<span
								class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium {sessionStatusBadgeClass(activeSession.status)}"
							>
								{sessionStatusLabel(activeSession.status)}
							</span>
						</p>
					{/if}
					{#if distanceLabel}
						<p class="mt-1 text-sm font-medium text-brand-700">{distanceLabel} away</p>
					{/if}
				</div>
				<button
					type="button"
					class="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
					onclick={close}
				>
					Close
				</button>
			</div>

			{#if activeSession?.start_at && activeSession.status === 'open'}
				<div class="px-4 pb-3">
					<SessionStartCountdown startAt={activeSession.start_at} showUntilStart />
				</div>
			{/if}

			<div class="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
				{#if loading && !session?.description}
					<div class="mt-3 app-skeleton h-16 w-full" aria-hidden="true"></div>
				{:else if loadError}
					<p class="mt-3 text-sm text-red-600">{loadError}</p>
				{:else if session}
					{#if membership}
						<div class="mt-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
							<p class="text-sm font-medium text-brand-800">
								{sessionPlayerStatusLabel(membership.status)}
							</p>
							{#if membership.status === 'waiting'}
								{#if session.status === 'in_progress'}
									<p class="mt-2 text-sm text-brand-700">
										This session is in progress. You cannot cancel your join. The admin may confirm
										you to play at any time.
									</p>
								{:else if isWithinCancelLockWindow}
									<p class="mt-2 text-sm text-brand-700">
										The admin is reviewing waiting players now. You can no longer cancel — they may
										confirm or reject you.
									</p>
								{:else}
									<p class="mt-2 text-sm text-brand-700">
										The admin will confirm your join request 15 minutes before the session starts.
										Please be at the venue and ready by then.
									</p>
								{/if}
							{:else if membership.status === 'confirmed'}
								{#if session.status === 'in_progress'}
									<p class="mt-2 text-sm text-brand-700">
										Session is live. Open the live session page to see costs, courts, and request an
										early leave.
									</p>
								{:else}
									<p class="mt-2 text-sm text-brand-700">
										You're confirmed for this session. Get ready — it starts
										{formatDateTime(session.start_at)}. You'll be taken to the live session when play
										begins.
									</p>
								{/if}
							{/if}
						</div>
					{/if}

					{#if session.has_outstanding_fee}
						<p class="mt-3 text-sm text-amber-800">
							You have an outstanding cancellation fee. Settle it before joining another session.
						</p>
					{/if}

					<RichTextDisplay
						html={session.description}
						class="prose prose-sm mt-4 max-w-none text-sm leading-relaxed text-slate-600"
					/>

					<div class="mt-6 space-y-4">
						<div class="rounded-2xl border border-slate-200 bg-white p-4">
							<h3 class="text-base font-semibold text-slate-900">Schedule</h3>
							<dl class="mt-3 space-y-2 text-sm">
								<div class="flex justify-between gap-4">
									<dt class="text-slate-500">Start</dt>
									<dd class="font-medium text-slate-900">{formatDateTime(session.start_at)}</dd>
								</div>
								<div class="flex justify-between gap-4">
									<dt class="text-slate-500">End</dt>
									<dd class="font-medium text-slate-900">{formatDateTime(session.end_at)}</dd>
								</div>
							</dl>
						</div>

						<div class="rounded-2xl border border-slate-200 bg-white p-4">
							<h3 class="text-base font-semibold text-slate-900">Venue</h3>
							{#if session.venue_name}
								<p class="mt-2 text-sm text-slate-700">{session.venue_name}</p>
							{/if}
							{#if hasLocation && googleMapsUrl && appleMapsUrl}
								<div class="mt-3 flex flex-wrap gap-x-4 gap-y-2">
									<a
										href={googleMapsUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="text-sm font-medium text-brand-700 hover:text-brand-800"
									>
										Google Maps
									</a>
									<a
										href={appleMapsUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="text-sm font-medium text-brand-700 hover:text-brand-800"
									>
										Apple Maps
									</a>
								</div>
							{/if}
						</div>

						<div class="rounded-2xl border border-slate-200 bg-white p-4">
							<h3 class="text-base font-semibold text-slate-900">Capacity & fees</h3>
							<dl class="mt-3 space-y-2 text-sm">
								{#if spotsLabel}
									<div class="flex justify-between gap-4">
										<dt class="text-slate-500">Availability</dt>
										<dd class="font-medium text-slate-900">{spotsLabel}</dd>
									</div>
								{/if}
								<div class="flex justify-between gap-4">
									<dt class="text-slate-500">Court fee</dt>
									<dd class="font-medium text-slate-900">
										{formatThb(session.court_fee_per_hour)}/hr · {session.court_count} court{session.court_count === 1 ? '' : 's'}
									</dd>
								</div>
								<div class="flex justify-between gap-4">
									<dt class="text-slate-500">Shuttle</dt>
									<dd class="text-right font-medium text-slate-900">{shuttleLabel}</dd>
								</div>
								{#if session.cancellation_fee > 0}
									<div class="flex justify-between gap-4">
										<dt class="text-slate-500">Late cancel fee</dt>
										<dd class="font-medium text-slate-900">
											{formatThb(session.cancellation_fee)} (&lt; 1 hr before start)
										</dd>
									</div>
								{/if}
							</dl>
						</div>

						<div class="rounded-2xl border border-slate-200 bg-white p-4">
							<h3 class="text-base font-semibold text-slate-900">Match settings</h3>
							<p class="mt-2 text-sm text-slate-600">
								{session.match_score_type} points · {matchTypeLabel(session.match_type)}
							</p>
						</div>

						{#if session.host}
							<div class="rounded-2xl border border-slate-200 bg-white p-4">
								<h3 class="text-base font-semibold text-slate-900">Host</h3>
								<div class="mt-2 flex items-center gap-2">
									<p class="text-sm font-medium text-slate-900">{session.host.display_name}</p>
									{#if session.host.tag}
										<TagPill tag={session.host.tag} />
									{/if}
								</div>
							</div>
						{/if}

						{#if membership && rosterReady}
							<div class="rounded-2xl border border-slate-200 bg-white p-4">
								<h3 class="text-base font-semibold text-slate-900">Participants</h3>
								<p class="mt-1 text-xs text-slate-500">
									Waiting list and buffer queue for this session.
								</p>

								<div class="mt-4 space-y-4">
									<div>
										<h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">
											Waiting list ({waitingPlayers.length})
										</h4>
										{#if waitingPlayers.length === 0}
											<p class="mt-2 text-sm text-slate-500">No players waiting.</p>
										{:else}
											<ul class="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
												{#each waitingPlayers as player (player.id)}
													<li class="flex items-center gap-3 bg-white px-3 py-2.5">
														<UserAvatar
															displayName={player.profile?.display_name ?? 'Player'}
															avatarUrl={player.profile?.avatar_url ?? null}
															size="sm"
														/>
														<div class="min-w-0 flex-1">
															<p class="truncate text-sm font-medium text-slate-900">
																{player.profile?.display_name ?? 'Unknown'}
																{#if player.is_me}
																	<span class="text-brand-700"> (you)</span>
																{/if}
															</p>
															<p class="text-xs text-slate-500">
																Joined {formatDateTime(player.joined_at)}
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
										<h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">
											Buffer queue ({queuedPlayers.length}/{session.max_buffer})
										</h4>
										{#if queuedPlayers.length === 0}
											<p class="mt-2 text-sm text-slate-500">No players in the buffer queue.</p>
										{:else}
											<ul class="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
												{#each queuedPlayers as player (player.id)}
													<li class="flex items-center gap-3 bg-white px-3 py-2.5">
														<UserAvatar
															displayName={player.profile?.display_name ?? 'Player'}
															avatarUrl={player.profile?.avatar_url ?? null}
															size="sm"
														/>
														<div class="min-w-0 flex-1">
															<p class="truncate text-sm font-medium text-slate-900">
																{player.profile?.display_name ?? 'Unknown'}
																{#if player.is_me}
																	<span class="text-brand-700"> (you)</span>
																{/if}
															</p>
															<p class="text-xs text-slate-500">
																Joined {formatDateTime(player.joined_at)}
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
										<h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">
											Confirmed ({confirmedPlayers.length})
										</h4>
										{#if confirmedPlayers.length === 0}
											<p class="mt-2 text-sm text-slate-500">No confirmed players yet.</p>
										{:else}
											<ul class="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
												{#each confirmedPlayers as player (player.id)}
													<li class="flex items-center gap-3 bg-white px-3 py-2.5">
														<UserAvatar
															displayName={player.profile?.display_name ?? 'Player'}
															avatarUrl={player.profile?.avatar_url ?? null}
															size="sm"
														/>
														<div class="min-w-0 flex-1">
															<p class="truncate text-sm font-medium text-slate-900">
																{player.profile?.display_name ?? 'Unknown'}
																{#if player.is_me}
																	<span class="text-brand-700"> (you)</span>
																{/if}
															</p>
															<p class="text-xs text-slate-500">
																Confirmed player
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
								</div>
							</div>
						{/if}
					</div>

					<div class="mt-6 space-y-3">
						{#if canJoin}
							<SubmitButton type="button" onclick={() => (joinModalOpen = true)}>
								Join session
							</SubmitButton>
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
								Cancel join
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
								<p class="text-xs text-slate-500">
									Cancelling within 1 hour of start may incur a {formatThb(session.cancellation_fee)} fee.
								</p>
							{/if}
						{/if}

						{#if cancelJoinLocked}
							<SubmitButton type="button" variant="secondary" disabled>
								Cancel join
							</SubmitButton>
							<p class="text-xs text-slate-500">
								Cancellation closed within 15 minutes of start. The admin may confirm or reject you. If
								you play and leave early, you will be billed your court fee share.
							</p>
						{/if}

						{#if canLeave}
							<SubmitButton type="button" variant="secondary" onclick={goToLiveSession}>
								Leave session
							</SubmitButton>
							<p class="text-xs text-slate-500">
								Early leave bills your court-fee share, requires admin payment confirmation, then admin
								leave approval — same as on the live session page.
							</p>
						{:else if session.status === 'in_progress' && hasActiveMembership}
							<SubmitButton type="button" onclick={goToLiveSession}>
								Open live session
							</SubmitButton>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>

	{#if joinModalOpen && session}
		<AppModal open={joinModalOpen} labelledBy="join-session-title" onClose={closeJoinModal}>
			<div class="overflow-hidden rounded-2xl bg-white shadow-xl">
				<div class="border-b border-brand-100 bg-brand-50 px-4 py-4">
					<h2 id="join-session-title" class="text-lg font-semibold text-brand-900">
						{isInProgressJoin ? 'Join session in progress?' : 'Before you join'}
					</h2>
					<div class="mt-3 space-y-3 text-sm text-brand-800">
						{#if isInProgressJoin}
							<p>This session has already started.</p>
							<p>
								Once you join, you cannot cancel your membership. To leave, you must pay at least
								your court fee share{#if estimatedCourtShare}
									(currently about {formatThb(estimatedCourtShare)} based on active players){/if}.
							</p>
							<p>
								Unpaid session fees will prevent you from joining other sessions until they are
								settled.
							</p>
						{:else}
							<p>
								Please arrive at the venue at least 15 minutes before the session starts ({formatDateTime(session.start_at)})
								so the admin can confirm your attendance.
							</p>
							<p>
								You can cancel from session details while on the waiting list until 15 minutes before
								start, or anytime while in the buffer queue.
							</p>
							{#if session.cancellation_fee > 0}
								<p>
									Cancelling within 1 hour of the session start may incur a late cancellation fee of
									{formatThb(session.cancellation_fee)}.
								</p>
							{/if}
						{/if}
					</div>
				</div>
				<form
					method="POST"
					action="/sessions?/join"
					class="flex flex-wrap gap-2 p-4"
					use:enhance={enhanceAction(true)}
				>
					<input type="hidden" name="session_id" value={session.id} />
					<SubmitButton loading={actionLoading} loadingLabel="Joining…" class="!w-auto">
						Join session
					</SubmitButton>
					<SubmitButton
						type="button"
						variant="secondary"
						class="!w-auto"
						disabled={actionLoading}
						onclick={closeJoinModal}
					>
						Cancel
					</SubmitButton>
				</form>
			</div>
		</AppModal>
	{/if}

	{#if cancelConfirmOpen && session}
		<AppModal open={cancelConfirmOpen} labelledBy="cancel-confirm-title" onClose={() => (cancelConfirmOpen = false)}>
			<div class="overflow-hidden rounded-2xl bg-white shadow-xl">
				<div class="border-b border-amber-100 bg-amber-50 px-4 py-4">
					<h2 id="cancel-confirm-title" class="text-lg font-semibold text-amber-900">
						Late cancellation fee
					</h2>
					<p class="mt-3 text-sm text-amber-900">
						Cancelling within 1 hour of start will record a late cancellation fee of
						{formatThb(session.cancellation_fee)}. You must pay this fee before joining another session.
					</p>
				</div>
				<form
					method="POST"
					action="/sessions?/cancel"
					class="flex flex-wrap gap-2 p-4"
					use:enhance={enhanceCancel}
				>
					<input type="hidden" name="session_id" value={session.id} />
					<SubmitButton loading={actionLoading} loadingLabel="Cancelling…" class="!w-auto">
						Accept and cancel
					</SubmitButton>
					<SubmitButton
						type="button"
						variant="secondary"
						class="!w-auto"
						disabled={actionLoading}
						onclick={() => (cancelConfirmOpen = false)}
					>
						Keep my spot
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
			sessionLabel="{session.name} · {session.club?.name ?? 'Club session'}"
			onClose={closeFeeModal}
			onSubmitted={onFeeSubmitted}
		/>
	{/if}
{/if}
