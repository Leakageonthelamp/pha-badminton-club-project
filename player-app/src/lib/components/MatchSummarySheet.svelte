<script lang="ts">
	import { browser } from '$app/environment';
	import { portal } from '@repo/ui/actions/portal';
	import MatchScoreDisplay from '@repo/ui/components/MatchScoreDisplay.svelte';
	import type { MatchSummaryLike } from '@repo/ui/components/MatchSummaryModal.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import { formatUptime } from '@repo/ui/datetime';
	import {
		deriveMatchWinner,
		isMatchDraw,
		matchStatusBadgeClass,
		matchStatusLabel,
		splitTeams
	} from '@repo/ui/matches';

	let {
		open = false,
		match = null,
		highlightUserId = null,
		sessionName = null,
		sessionHref = null,
		onClose
	}: {
		open?: boolean;
		match: MatchSummaryLike | null;
		highlightUserId?: string | null;
		sessionName?: string | null;
		sessionHref?: string | null;
		onClose: () => void;
	} = $props();

	// ponytail: drag boilerplate mirrors ClubDetailSheet / SessionDetailSheet
	let show = $state(false);
	let visible = $state(false);
	let panelEl = $state<HTMLDivElement | null>(null);
	let dragOffset = $state(0);
	let dragging = $state(false);
	let dragStartY = 0;
	let dragStartOffset = 0;

	const DISMISS_DRAG_PX = 120;

	const teams = $derived(match ? splitTeams(match.players) : { teamA: [], teamB: [] });
	const matchWinner = $derived(match ? deriveMatchWinner(match.games) : null);
	const matchDraw = $derived(match ? isMatchDraw(match.games) : false);
	const teamAForScore = $derived(
		teams.teamA.map((player) => ({
			team: 'A' as const,
			displayName: player.profile?.display_name
		}))
	);
	const teamBForScore = $derived(
		teams.teamB.map((player) => ({
			team: 'B' as const,
			displayName: player.profile?.display_name
		}))
	);
	const durationLabel = $derived.by(() => {
		if (!match?.started_at || !match.ended_at) return null;
		const endedMs = new Date(match.ended_at).getTime();
		if (Number.isNaN(endedMs)) return null;
		return formatUptime(match.started_at, endedMs);
	});

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

	$effect(() => {
		if (!browser) return;

		if (!open || !match) {
			visible = false;
			resetDrag();
			const timer = window.setTimeout(() => {
				show = false;
			}, 240);
			return () => window.clearTimeout(timer);
		}

		show = true;
		resetDrag();

		const frame = window.requestAnimationFrame(() => {
			visible = true;
		});

		return () => window.cancelAnimationFrame(frame);
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

{#if browser && show && match}
	<div use:portal class="bottom-sheet-root" class:bottom-sheet-root--open={visible}>
		<button
			type="button"
			class="bottom-sheet-backdrop"
			aria-label="Close match summary"
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
			aria-labelledby="match-summary-title"
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
				<div class="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden="true"></div>
			</div>

			<div class="app-surface-header flex shrink-0 items-start justify-between gap-3 pb-4">
				<div class="min-w-0">
					<p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Match summary</p>
					<h2 id="match-summary-title" class="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
						Court {match.court_number}
					</h2>
					{#if matchWinner}
						<p class="mt-1 text-sm text-emerald-700">Team {matchWinner} won</p>
					{:else if matchDraw}
						<p class="mt-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">Match drawn</p>
					{/if}
					<div class="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
						{#if durationLabel}
							<span class="font-mono tabular-nums">{durationLabel}</span>
						{/if}
						<span>
							{match.shuttles_used} shuttle{match.shuttles_used === 1 ? '' : 's'}
						</span>
						{#if sessionName && sessionHref}
							<a
								href={sessionHref}
								class="font-medium text-brand-700 dark:text-brand-300 hover:text-brand-800"
								onclick={close}
							>
								{sessionName} →
							</a>
						{/if}
					</div>
				</div>
				<div class="flex shrink-0 flex-col items-end gap-2">
					<span
						class="rounded-full px-2.5 py-1 text-xs font-semibold {matchStatusBadgeClass(
							match.status
						)}"
					>
						{matchStatusLabel(match.status)}
					</span>
					<button
						type="button"
						class="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
						onclick={close}
					>
						Close
					</button>
				</div>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto pb-6">
				{#if match.games.length}
					<div class="border-b border-slate-100 dark:border-slate-800 py-4">
						<MatchScoreDisplay
							games={match.games}
							teamA={teamAForScore}
							teamB={teamBForScore}
							heading={null}
							embedded
						/>
					</div>
				{/if}

				<div class="space-y-4 py-4">
					<div class="space-y-2">
						<p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Team A</p>
						<ul class="space-y-2">
							{#each teams.teamA as player (player.user_id ?? player.profile?.display_name)}
								<li class="app-list-row flex items-center gap-3 p-3">
									<UserAvatar
										displayName={player.profile?.display_name ?? 'Player'}
										avatarUrl={player.profile?.avatar_url ?? null}
										size="sm"
									/>
									<div class="min-w-0 flex-1">
										<p class="truncate font-medium text-slate-800 dark:text-slate-200">
											{player.profile?.display_name ?? 'Player'}
											{#if highlightUserId && player.user_id === highlightUserId}
												<span class="text-slate-500 dark:text-slate-400 dark:text-slate-500">(you)</span>
											{/if}
										</p>
										{#if player.profile?.tag}
											<TagPill tag={player.profile.tag} class="mt-1" />
										{/if}
									</div>
								</li>
							{/each}
						</ul>
					</div>
					<div class="space-y-2">
						<p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">Team B</p>
						<ul class="space-y-2">
							{#each teams.teamB as player (player.user_id ?? player.profile?.display_name)}
								<li class="app-list-row flex items-center gap-3 p-3">
									<UserAvatar
										displayName={player.profile?.display_name ?? 'Player'}
										avatarUrl={player.profile?.avatar_url ?? null}
										size="sm"
									/>
									<div class="min-w-0 flex-1">
										<p class="truncate font-medium text-slate-800 dark:text-slate-200">
											{player.profile?.display_name ?? 'Player'}
											{#if highlightUserId && player.user_id === highlightUserId}
												<span class="text-slate-500 dark:text-slate-400 dark:text-slate-500">(you)</span>
											{/if}
										</p>
										{#if player.profile?.tag}
											<TagPill tag={player.profile.tag} class="mt-1" />
										{/if}
									</div>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
