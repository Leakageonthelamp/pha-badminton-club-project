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
	<div class="app-card-padded space-y-4">
		<div>
			<h2 id="matchmaking-modal-title" class="text-lg font-semibold text-slate-900">
				Assign match — Court {courtNumber ?? '—'}
			</h2>
			<p class="mt-1 text-sm text-slate-500">Pick a match-making mode, then select 4 idle players.</p>
		</div>

		<div class="grid gap-2 sm:grid-cols-2">
			<button
				type="button"
				class="rounded-xl border border-brand-300 bg-brand-50 px-3 py-3 text-left"
			>
				<p class="text-sm font-semibold text-brand-900">Manual</p>
				<p class="mt-1 text-xs text-brand-800">Select 4 players from the idle list.</p>
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

		<div class="space-y-2">
			<div class="flex items-center justify-between gap-2">
				<p class="text-sm font-medium text-slate-800">Idle players</p>
				<p class="text-xs text-slate-500">{selectedIds.length}/4 selected</p>
			</div>

			{#if idlePlayers.length === 0}
				<p class="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
					No idle players available right now.
				</p>
			{:else}
				<ul class="max-h-72 space-y-2 overflow-y-auto">
					{#each idlePlayers as player (player.id)}
						{@const idleSince = clampIdleSince(player.idle_since, sessionStartAt)}
						{@const selected = selectedIds.includes(player.user_id)}
						<li>
							<button
								type="button"
								class="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition {selected
									? 'border-brand-300 bg-brand-50'
									: 'border-slate-200 hover:border-slate-300'}"
								onclick={() => togglePlayer(player.user_id)}
							>
								<UserAvatar
									displayName={player.profile?.display_name ?? 'Player'}
									avatarUrl={player.profile?.avatar_url ?? null}
									size="sm"
								/>
								<div class="min-w-0 flex-1">
									<p class="truncate font-medium text-slate-800">
										{player.profile?.display_name ?? 'Unknown player'}
									</p>
									{#if player.profile?.tag}
										<TagPill tag={player.profile.tag} />
									{/if}
								</div>
								{#if idleSince}
									<span class="font-mono text-xs text-slate-500">
										{formatUptime(idleSince, Date.now())}
									</span>
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="flex justify-end gap-2">
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
