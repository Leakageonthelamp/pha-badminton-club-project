<script lang="ts">
	import { enhance } from '$app/forms';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SlipPreviewModal from '@repo/ui/components/SlipPreviewModal.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import {
		cancellationFeeStatusLabel,
		formatThb,
		isOutstandingCancellationFee,
		type CancellationFeeStatus
	} from '@repo/ui/payments';
	import { slipPreviewUrl } from '$lib/slips';
	import { sessionPlayerStatusLabel, type SessionPlayerWithProfile } from '$lib/types/session';
	import type { SubmitFunction } from '@sveltejs/kit';

	let {
		fees,
		sessionId,
		feeActionLoading = $bindable<string | null>(null)
	}: {
		fees: SessionPlayerWithProfile[];
		sessionId: string;
		feeActionLoading?: string | null;
	} = $props();

	let slipPreviewPath = $state<string | null>(null);
	let confirmWithoutSlipPlayerId = $state<string | null>(null);
	let confirmForms = $state<Record<string, HTMLFormElement | undefined>>({});

	const outstandingCount = $derived(
		fees.filter((fee) => isOutstandingCancellationFee(fee.fee_owed, fee.fee_status)).length
	);

	const handleFeeAction =
		(playerId: string, action: 'confirm' | 'waive'): SubmitFunction =>
		() => {
			feeActionLoading = `${action}-${playerId}`;
			return async ({ update }) => {
				await update({ reset: false });
				feeActionLoading = null;
			};
		};

	const requestConfirmFee = (fee: SessionPlayerWithProfile) => {
		if (fee.fee_slip_path) {
			confirmForms[fee.id]?.requestSubmit();
			return;
		}

		confirmWithoutSlipPlayerId = fee.id;
	};

	const confirmWithoutSlip = () => {
		if (!confirmWithoutSlipPlayerId) return;
		confirmForms[confirmWithoutSlipPlayerId]?.requestSubmit();
		confirmWithoutSlipPlayerId = null;
	};

	const feeCardClass = (feeStatus: CancellationFeeStatus, outstanding: boolean): string => {
		if (!outstanding) {
			if (feeStatus === 'paid') return 'border-emerald-200 bg-emerald-50/30';
			if (feeStatus === 'waived') return 'border-slate-200 dark:border-slate-700 bg-slate-50/80';
			return 'border-slate-200 dark:border-slate-700 bg-white';
		}
		if (feeStatus === 'submitted') return 'border-sky-200 bg-sky-50/40';
		return 'border-amber-200 bg-amber-50/40';
	};

	const feeBadgeClass = (feeStatus: CancellationFeeStatus, outstanding: boolean): string => {
		if (!outstanding) {
			if (feeStatus === 'paid') return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
			return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-500 ring-slate-200';
		}
		if (feeStatus === 'submitted') return 'bg-sky-100 text-sky-800 ring-sky-200';
		return 'bg-amber-100 text-amber-900 ring-amber-200';
	};

	const compactButtonClass = '!w-auto !rounded-lg !px-3 !py-2 !text-sm';
</script>

{#if fees.length === 0}
	<EmptyState message="No cancellation fees for this session." />
{:else}
	{#if outstandingCount > 0}
		<p class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
			{outstandingCount} fee{outstandingCount === 1 ? '' : 's'} waiting for your confirmation or
			waiver.
		</p>
	{/if}
	<ul class="space-y-3">
		{#each fees as fee (fee.id)}
			{@const outstanding = isOutstandingCancellationFee(fee.fee_owed, fee.fee_status)}
			<li class="rounded-2xl border p-4 {feeCardClass(fee.fee_status, outstanding)}">
				<div class="flex items-start gap-3">
					<UserAvatar
						displayName={fee.profile?.display_name ?? 'Player'}
						avatarUrl={fee.profile?.avatar_url ?? null}
						size="sm"
					/>
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
							<p class="truncate font-semibold text-slate-900 dark:text-slate-100">
								{fee.profile?.display_name ?? 'Unknown player'}
							</p>
							{#if fee.profile?.tag}
								<TagPill tag={fee.profile.tag} />
							{/if}
						</div>
						<p class="mt-0.5 text-xs text-slate-600 dark:text-slate-400 dark:text-slate-500">
							{sessionPlayerStatusLabel(fee.status)} · late cancel
						</p>
					</div>
					<div class="flex shrink-0 flex-col items-end gap-1.5">
						<p class="text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
							{formatThb(fee.fee_owed)}
						</p>
						<span
							class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 {feeBadgeClass(
								fee.fee_status,
								outstanding
							)}"
						>
							{cancellationFeeStatusLabel(fee.fee_status)}
						</span>
					</div>
				</div>

				{#if outstanding}
					<div
						class="mt-4 grid grid-cols-1 gap-2 border-t border-slate-200/70 pt-4 sm:grid-cols-[1fr_auto]"
					>
						{#if fee.fee_slip_path}
							<SubmitButton
								type="button"
								variant="secondary"
								class="{compactButtonClass} sm:col-span-2"
								onclick={() => (slipPreviewPath = fee.fee_slip_path)}
							>
								Preview slip
							</SubmitButton>
						{/if}
						<form
							bind:this={confirmForms[fee.id]}
							method="POST"
							action="?/confirmFee"
							class="min-w-0"
							use:enhance={handleFeeAction(fee.id, 'confirm')}
						>
							<input type="hidden" name="session_id" value={sessionId} />
							<input type="hidden" name="player_id" value={fee.id} />
							<SubmitButton
								type="button"
								class="{compactButtonClass} sm:!w-full"
								loading={feeActionLoading === `confirm-${fee.id}`}
								loadingLabel="Confirming…"
								disabled={!!feeActionLoading}
								onclick={() => requestConfirmFee(fee)}
							>
								Confirm paid
							</SubmitButton>
						</form>
						<form
							method="POST"
							action="?/waiveFee"
							class="min-w-0"
							use:enhance={handleFeeAction(fee.id, 'waive')}
						>
							<input type="hidden" name="session_id" value={sessionId} />
							<input type="hidden" name="player_id" value={fee.id} />
							<SubmitButton
								variant="secondary"
								class="{compactButtonClass} sm:!w-full"
								loading={feeActionLoading === `waive-${fee.id}`}
								loadingLabel="Waiving…"
								disabled={!!feeActionLoading}
							>
								Waive fee
							</SubmitButton>
						</form>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<SlipPreviewModal
	open={slipPreviewPath !== null}
	imageUrl={slipPreviewPath ? slipPreviewUrl(slipPreviewPath) : ''}
	onClose={() => (slipPreviewPath = null)}
/>

<AppModal
	open={confirmWithoutSlipPlayerId !== null}
	labelledBy="confirm-fee-without-slip-title"
	onClose={() => (confirmWithoutSlipPlayerId = null)}
>
	<div class="app-card-padded space-y-4">
		<h2 id="confirm-fee-without-slip-title" class="text-lg font-semibold text-red-800">
			Confirm without bank slip?
		</h2>
		<p class="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
			This player has not attached a bank transfer slip. Only confirm if you have verified payment
			through another channel.
		</p>
		<div class="flex flex-wrap gap-2">
			<SubmitButton type="button" variant="secondary" class="!w-auto" onclick={() => (confirmWithoutSlipPlayerId = null)}>
				Cancel
			</SubmitButton>
			<SubmitButton type="button" class="!w-auto !bg-red-700 hover:!bg-red-800" onclick={confirmWithoutSlip}>
				Confirm anyway
			</SubmitButton>
		</div>
	</div>
</AppModal>
