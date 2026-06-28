<script lang="ts">
	import { enhance } from '$app/forms';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import {
		cancellationFeeStatusLabel,
		formatThb,
		isOutstandingCancellationFee,
		type CancellationFeeStatus
	} from '@repo/ui/payments';
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

	const feeCardClass = (feeStatus: CancellationFeeStatus, outstanding: boolean): string => {
		if (!outstanding) {
			if (feeStatus === 'paid') return 'border-emerald-200 bg-emerald-50/30';
			if (feeStatus === 'waived') return 'border-slate-200 bg-slate-50/80';
			return 'border-slate-200 bg-white';
		}
		if (feeStatus === 'submitted') return 'border-sky-200 bg-sky-50/40';
		return 'border-amber-200 bg-amber-50/40';
	};

	const feeBadgeClass = (feeStatus: CancellationFeeStatus, outstanding: boolean): string => {
		if (!outstanding) {
			if (feeStatus === 'paid') return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
			return 'bg-slate-100 text-slate-600 ring-slate-200';
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
							<p class="truncate font-semibold text-slate-900">
								{fee.profile?.display_name ?? 'Unknown player'}
							</p>
							{#if fee.profile?.tag}
								<TagPill tag={fee.profile.tag} />
							{/if}
						</div>
						<p class="mt-0.5 text-xs text-slate-600">
							{sessionPlayerStatusLabel(fee.status)} · late cancel
						</p>
					</div>
					<div class="flex shrink-0 flex-col items-end gap-1.5">
						<p class="text-base font-semibold tabular-nums text-slate-900">
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
						<form
							method="POST"
							action="?/confirmFee"
							class="min-w-0"
							use:enhance={handleFeeAction(fee.id, 'confirm')}
						>
							<input type="hidden" name="session_id" value={sessionId} />
							<input type="hidden" name="player_id" value={fee.id} />
							<SubmitButton
								class="{compactButtonClass} sm:!w-full"
								loading={feeActionLoading === `confirm-${fee.id}`}
								loadingLabel="Confirming…"
								disabled={!!feeActionLoading}
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
