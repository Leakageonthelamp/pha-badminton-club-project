<script lang="ts">
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import { formatUptime } from '@repo/ui/datetime';
	import { clampIdleSince } from '@repo/ui/sessionStatus';
	import type { SessionPlayerWithProfile } from '$lib/types/session';

	let {
		open = false,
		courtNumber,
		sessionStartAt,
		idlePlayers,
		loading = false,
		onClose,
		onSubmit
	}: {
		open?: boolean;
		courtNumber: number | null;
		sessionStartAt: string;
		idlePlayers: SessionPlayerWithProfile[];
		loading?: boolean;
		onClose?: () => void;
		onSubmit?: (userIds: string[]) => void;
	} = $props();

	let selectedIds = $state<string[]>([]);

	$effect(() => {
		if (!open) {
			selectedIds = [];
		}
	});

	const playerByUserId = (userId: string) =>
		idlePlayers.find((player) => player.user_id === userId) ?? null;

	const playerName = (player: SessionPlayerWithProfile) =>
		player.profile?.display_name ?? 'Unknown player';

	const slotPlayer = (index: number) => {
		const userId = selectedIds[index];
		return userId ? playerByUserId(userId) : null;
	};

	const teamLabelForIndex = (index: number): 'A' | 'B' | null => {
		if (index < 0 || index >= selectedIds.length) return null;
		return index < 2 ? 'A' : 'B';
	};

	const togglePlayer = (userId: string) => {
		if (selectedIds.includes(userId)) {
			selectedIds = selectedIds.filter((id) => id !== userId);
			return;
		}

		if (selectedIds.length >= 4) return;
		selectedIds = [...selectedIds, userId];
	};

	const handleSubmit = () => {
		if (selectedIds.length !== 4) return;
		onSubmit?.(selectedIds);
	};
</script>

<AppModal {open} labelledBy="matchmaking-modal-title" onClose={onClose}>
	<div class="flex max-h-[min(92vh,800px)] flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
		<div class="space-y-4 border-b border-slate-100 px-5 py-4">
			<div>
				<h2 id="matchmaking-modal-title" class="text-lg font-semibold text-slate-900">
					Assign match — Court {courtNumber ?? '—'}
				</h2>
				<p class="mt-1 text-sm text-slate-500">
					Select 4 idle players in order — first two are Team A, last two are Team B.
				</p>
			</div>

			<div class="grid gap-2 sm:grid-cols-2">
				<button
					type="button"
					class="rounded-xl border border-brand-300 bg-brand-50 px-3 py-3 text-left"
				>
					<p class="text-sm font-semibold text-brand-900">Manual</p>
					<p class="mt-1 text-xs text-brand-800">Pick pairs for each team from the idle list.</p>
				</button>
				<button
					type="button"
					disabled
					class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left opacity-60"
				>
					<p class="text-sm font-semibold text-slate-700">Auto (ELO)</p>
					<p class="mt-1 text-xs text-slate-500">Coming soon — rank-based pairing.</p>
				</button>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<div class="rounded-xl border border-brand-200 bg-brand-50/60 p-3">
					<div class="flex items-center justify-between gap-2">
						<p class="text-xs font-semibold uppercase tracking-wide text-brand-800">Team A</p>
						<p class="text-xs text-brand-700">{Math.min(selectedIds.length, 2)}/2</p>
					</div>
					<ul class="mt-2 space-y-2">
						{#each [0, 1] as slot (slot)}
							{@const player = slotPlayer(slot)}
							<li
								class="flex min-h-11 items-center gap-2 rounded-lg border px-2.5 py-2 {player
									? 'border-brand-200 bg-white'
									: 'border-dashed border-brand-200/80 bg-white/50'}"
							>
								{#if player}
									<UserAvatar
										displayName={playerName(player)}
										avatarUrl={player.profile?.avatar_url ?? null}
										size="sm"
									/>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium text-slate-800">{playerName(player)}</p>
									</div>
									<button
										type="button"
										class="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
										onclick={() => togglePlayer(player.user_id)}
									>
										Remove
									</button>
								{:else}
									<p class="text-sm text-brand-700/70">Player {slot + 1}</p>
								{/if}
							</li>
						{/each}
					</ul>
				</div>

				<div class="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
					<div class="flex items-center justify-between gap-2">
						<p class="text-xs font-semibold uppercase tracking-wide text-slate-600">Team B</p>
						<p class="text-xs text-slate-500">{Math.max(0, selectedIds.length - 2)}/2</p>
					</div>
					<ul class="mt-2 space-y-2">
						{#each [2, 3] as slot (slot)}
							{@const player = slotPlayer(slot)}
							<li
								class="flex min-h-11 items-center gap-2 rounded-lg border px-2.5 py-2 {player
									? 'border-slate-200 bg-white'
									: 'border-dashed border-slate-200 bg-white/50'}"
							>
								{#if player}
									<UserAvatar
										displayName={playerName(player)}
										avatarUrl={player.profile?.avatar_url ?? null}
										size="sm"
									/>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium text-slate-800">{playerName(player)}</p>
									</div>
									<button
										type="button"
										class="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
										onclick={() => togglePlayer(player.user_id)}
									>
										Remove
									</button>
								{:else}
									<p class="text-sm text-slate-500">Player {slot - 1}</p>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>

		<div class="flex min-h-[19rem] min-w-0 flex-1 flex-col px-5 py-4">
			<div class="mb-2 flex items-center justify-between gap-2">
				<p class="text-sm font-medium text-slate-800">Idle players</p>
				<p class="text-xs text-slate-500">{selectedIds.length}/4 selected</p>
			</div>

			{#if idlePlayers.length === 0}
				<p class="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
					No idle players available right now.
				</p>
			{:else}
				<ul
					class="min-h-[18.25rem] max-h-[min(32rem,52vh)] space-y-2 overflow-y-auto pr-1"
				>
					{#each idlePlayers as player (player.id)}
						{@const idleSince = clampIdleSince(player.idle_since, sessionStartAt)}
						{@const selectedIndex = selectedIds.indexOf(player.user_id)}
						{@const selected = selectedIndex >= 0}
						{@const team = teamLabelForIndex(selectedIndex)}
						<li>
							<button
								type="button"
								class="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition {selected
									? team === 'A'
										? 'border-brand-300 bg-brand-50'
										: 'border-slate-300 bg-slate-100'
									: 'border-slate-200 hover:border-slate-300'}"
								onclick={() => togglePlayer(player.user_id)}
							>
								<UserAvatar
									displayName={playerName(player)}
									avatarUrl={player.profile?.avatar_url ?? null}
									size="sm"
								/>
								<div class="min-w-0 flex-1">
									<p class="truncate font-medium text-slate-800">{playerName(player)}</p>
									{#if player.profile?.tag}
										<TagPill tag={player.profile.tag} />
									{/if}
								</div>
								<div class="flex shrink-0 flex-col items-end gap-1">
									{#if team}
										<span
											class="rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide {team ===
											'A'
												? 'bg-brand-100 text-brand-800'
												: 'bg-slate-200 text-slate-700'}"
										>
											Team {team}
										</span>
									{/if}
									{#if idleSince}
										<span class="font-mono text-xs text-slate-500">
											{formatUptime(idleSince, Date.now())}
										</span>
									{/if}
								</div>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
			<SubmitButton type="button" variant="secondary" onclick={onClose}>Cancel</SubmitButton>
			<SubmitButton
				type="button"
				loading={loading}
				disabled={selectedIds.length !== 4}
				onclick={handleSubmit}
			>
				Send match invite
			</SubmitButton>
		</div>
	</div>
</AppModal>
