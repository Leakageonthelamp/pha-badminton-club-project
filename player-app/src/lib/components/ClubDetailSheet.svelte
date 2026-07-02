<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { portal } from '@repo/ui/actions/portal';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import RichTextDisplay from '@repo/ui/components/RichTextDisplay.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import {
		formatDistanceKm,
		haversineDistanceKm,
		loadStoredUserLocation,
		appleMapsSearchUrl,
		mapsSearchUrl
	} from '@repo/ui/geolocation';
	import {
		type ClubAdminPublic,
		type ClubDetail,
		type ClubPublic,
		type ClubSessionPublic,
		type ClubShuttlePublic
	} from '$lib/types/club';
	import { sessionPlayerStatusLabel, sessionStatusLabel } from '$lib/types/session';
	import { liveSessionHref, shouldOpenLiveSession } from '$lib/sessions/navigation';
	import { formatDateTime } from '@repo/ui/datetime';

	let {
		open = false,
		clubId = null,
		preview = null,
		onClose,
		onSessionSelect
	}: {
		open?: boolean;
		clubId?: string | null;
		preview?: ClubPublic | null;
		onClose: () => void;
		onSessionSelect?: (sessionId: string) => void;
	} = $props();

	let show = $state(false);
	let visible = $state(false);
	let loading = $state(false);
	let loadError = $state<string | null>(null);
	let club = $state<ClubPublic | null>(null);
	let admins = $state<ClubAdminPublic[]>([]);
	let shuttles = $state<ClubShuttlePublic[]>([]);
	let openingSessions = $state<ClubSessionPublic[]>([]);
	let upcomingSessions = $state<ClubSessionPublic[]>([]);
	let panelEl = $state<HTMLDivElement | null>(null);
	let dragOffset = $state(0);
	let dragging = $state(false);
	let dragStartY = 0;
	let dragStartOffset = 0;

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
		if (event.key === 'Escape') {
			close();
		}
	};

	const title = $derived(club?.name ?? preview?.name ?? 'Club');
	const description = $derived(club?.description ?? preview?.description ?? '');
	const activeClub = $derived(club ?? preview);
	const hasLocation = $derived(
		activeClub?.latitude !== null &&
			activeClub?.latitude !== undefined &&
			activeClub?.longitude !== null &&
			activeClub?.longitude !== undefined
	);
	const distanceLabel = $derived.by(() => {
		if (!browser || !hasLocation || !activeClub) return null;

		const userLocation = loadStoredUserLocation();
		if (!userLocation) return null;

		const distanceKm = haversineDistanceKm(
			userLocation.latitude,
			userLocation.longitude,
			activeClub.latitude!,
			activeClub.longitude!
		);

		return formatDistanceKm(distanceKm);
	});
	const googleMapsUrl = $derived(
		hasLocation && activeClub
			? mapsSearchUrl(activeClub.latitude!, activeClub.longitude!)
			: null
	);
	const appleMapsUrl = $derived(
		hasLocation && activeClub
			? appleMapsSearchUrl(activeClub.latitude!, activeClub.longitude!)
			: null
	);

	const venueName = $derived(club?.venue_name ?? preview?.venue_name ?? null);
	const hasSessions = $derived(openingSessions.length > 0 || upcomingSessions.length > 0);

	const sessionMeta = (session: ClubSessionPublic) => {
		const parts = [sessionStatusLabel(session.status), formatDateTime(session.start_at)];
		if (session.my_membership) {
			parts.push(sessionPlayerStatusLabel(session.my_membership.status));
		} else {
			parts.push(`${session.waiting_count}/${session.max_players} spots`);
		}
		return parts.join(' · ');
	};

	const selectSession = (session: ClubSessionPublic) => {
		if (shouldOpenLiveSession(session)) {
			close();
			void goto(liveSessionHref(session.id));
			return;
		}

		onSessionSelect?.(session.id);
	};

	$effect(() => {
		if (!browser) return;

		if (!open || !clubId) {
			visible = false;
			resetDrag();
			const timer = window.setTimeout(() => {
				show = false;
				club = null;
				admins = [];
				shuttles = [];
				openingSessions = [];
				upcomingSessions = [];
				loadError = null;
				loading = false;
			}, 240);
			return () => window.clearTimeout(timer);
		}

		show = true;
		resetDrag();
		loadError = null;
		club = preview;
		admins = [];
		shuttles = [];
		openingSessions = [];
		upcomingSessions = [];
		loading = true;

		const frame = window.requestAnimationFrame(() => {
			visible = true;
		});

		let cancelled = false;

		fetch(`/api/clubs/${clubId}`)
			.then(async (response) => {
				if (!response.ok) {
					const message =
						response.status === 404 ? 'Club not found.' : 'Could not load club details.';
					throw new Error(message);
				}
				return response.json() as Promise<ClubDetail>;
			})
			.then((detail) => {
				if (cancelled) return;
				club = detail.club;
				admins = detail.admins ?? [];
				shuttles = detail.shuttles ?? [];
				openingSessions = detail.openingSessions ?? [];
				upcomingSessions = detail.upcomingSessions ?? [];
			})
			.catch((err) => {
				if (cancelled) return;
				loadError = err instanceof Error ? err.message : 'Could not load club details.';
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
			aria-label="Close club details"
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
			aria-labelledby="club-sheet-title"
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

			<div class="flex shrink-0 items-start justify-between gap-3 pb-3">
				<div class="min-w-0">
					<h2 id="club-sheet-title" class="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
					{#if distanceLabel}
						<p class="mt-1 text-sm font-medium text-brand-700">{distanceLabel} away</p>
					{/if}
				</div>
				<button
					type="button"
					class="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-700 dark:text-slate-300 dark:text-slate-600"
					onclick={close}
				>
					Close
				</button>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto pb-6">
				{#if loading && !description}
					<div class="mt-3 app-skeleton h-16 w-full" aria-hidden="true"></div>
				{:else}
					<RichTextDisplay
						html={description}
						class="prose prose-sm mt-3 max-w-none text-sm leading-relaxed text-slate-600 dark:text-slate-400 dark:text-slate-500"
					/>
				{/if}

				<div class="mt-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
					<h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">Venue</h3>
					{#if loading}
						<div class="mt-3 app-skeleton h-4 w-40"></div>
					{:else if venueName}
						<p class="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{venueName}</p>
					{/if}
					{#if loading}
						<div class="mt-3 app-skeleton h-4 w-52"></div>
					{:else if hasLocation && googleMapsUrl && appleMapsUrl}
						<p class="mt-2 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">Get directions on the map.</p>
						<div class="mt-3 flex flex-wrap gap-x-4 gap-y-2">
							<a
								href={googleMapsUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="text-sm font-medium text-brand-700 dark:text-brand-300 hover:text-brand-800"
							>
								Open in Google Maps
							</a>
							<a
								href={appleMapsUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="text-sm font-medium text-brand-700 dark:text-brand-300 hover:text-brand-800"
							>
								Open in Apple Maps
							</a>
						</div>
					{:else if !venueName}
						<p class="mt-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Venue location has not been set yet.</p>
					{/if}
				</div>

				<div class="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4" aria-busy={loading}>
					<h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">Sessions</h3>
					<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">Open and upcoming games at this club.</p>

					{#if loading}
						<ul
							class="mt-4 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
							aria-label="Loading sessions"
						>
							{#each [0, 1] as row (row)}
								<li class="bg-white dark:bg-slate-900 px-4 py-3">
									<div class="app-skeleton h-4 w-40"></div>
									<div class="app-skeleton mt-2 h-3 w-56"></div>
								</li>
							{/each}
						</ul>
					{:else if loadError}
						<p class="mt-4 text-sm text-red-600">{loadError}</p>
					{:else if !hasSessions}
						<p class="mt-4 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">No open or upcoming sessions yet.</p>
					{:else}
						{#if openingSessions.length > 0}
							<p class="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
								Open now
							</p>
							<ul
								class="mt-2 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
							>
								{#each openingSessions as session (session.id)}
									<li>
										<button
											type="button"
											class="w-full bg-white dark:bg-slate-900 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-950"
											onclick={() => selectSession(session)}
										>
											<p class="font-medium text-slate-900 dark:text-slate-100">{session.name}</p>
											<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">{sessionMeta(session)}</p>
											{#if session.venue_name}
												<p class="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{session.venue_name}</p>
											{/if}
										</button>
									</li>
								{/each}
							</ul>
						{/if}

						{#if upcomingSessions.length > 0}
							<p class="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
								Upcoming
							</p>
							<ul
								class="mt-2 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
							>
								{#each upcomingSessions as session (session.id)}
									<li>
										<button
											type="button"
											class="w-full bg-white dark:bg-slate-900 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-950"
											onclick={() => selectSession(session)}
										>
											<p class="font-medium text-slate-900 dark:text-slate-100">{session.name}</p>
											<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">{sessionMeta(session)}</p>
											{#if session.venue_name}
												<p class="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{session.venue_name}</p>
											{/if}
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					{/if}
				</div>

				<div class="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4" aria-busy={loading}>
					<h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">Shuttlecocks</h3>
					<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">Brands and speeds this club uses.</p>

					{#if loading}
						<ul
							class="mt-4 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
							aria-label="Loading shuttlecocks"
						>
							{#each [0, 1] as row (row)}
								<li class="bg-white dark:bg-slate-900 px-4 py-3">
									<div class="app-skeleton h-4 w-36"></div>
								</li>
							{/each}
						</ul>
					{:else if loadError}
						<p class="mt-4 text-sm text-red-600">{loadError}</p>
					{:else if shuttles.length === 0}
						<p class="mt-4 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">No shuttlecocks listed yet.</p>
					{:else}
						<ul
							class="mt-4 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
						>
							{#each shuttles as shuttle (shuttle.id)}
								<li class="bg-white dark:bg-slate-900 px-4 py-3">
									<p class="font-medium text-slate-900 dark:text-slate-100">
										{shuttle.name}
										<span class="text-slate-500 dark:text-slate-400 dark:text-slate-500">· {shuttle.speed}</span>
									</p>
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				<div class="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4" aria-busy={loading}>
					<h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">Club admins</h3>
					<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">People who manage this club.</p>

					{#if loading}
						<ul
							class="mt-4 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
							aria-label="Loading club admins"
						>
							{#each [0, 1, 2] as row (row)}
								<li class="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-3">
									<div class="app-skeleton h-9 w-9 shrink-0 rounded-full"></div>
									<div class="min-w-0 flex-1">
										<div class="app-skeleton h-4 w-32 max-w-[60%]"></div>
									</div>
									<div class="app-skeleton h-6 w-16 rounded-full"></div>
								</li>
							{/each}
						</ul>
					{:else if loadError}
						<p class="mt-4 text-sm text-red-600">{loadError}</p>
					{:else if admins.length === 0}
						<p class="mt-4 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">No admins assigned yet.</p>
					{:else}
						<ul
							class="mt-4 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
						>
							{#each admins as admin (admin.user_id)}
								<li class="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-3">
									<UserAvatar
										displayName={admin.display_name}
										avatarUrl={admin.avatar_url}
										size="sm"
									/>
									<div class="min-w-0 flex-1">
										<p class="truncate font-medium text-slate-900 dark:text-slate-100">{admin.display_name}</p>
									</div>
									{#if admin.tag}
										<TagPill tag={admin.tag} />
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
