<script lang="ts">
	import { enhance } from '$app/forms';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import { cancellationFeeStatusLabel, formatThb } from '@repo/ui/payments';
	import type { CancellationFeeStatus } from '@repo/ui/payments';
	import PaymentQr from '$lib/components/PaymentQr.svelte';
	import SlipUploadField from '$lib/components/SlipUploadField.svelte';
	import type { SubmitFunction } from '@sveltejs/kit';

	let {
		open = false,
		playerId,
		amount,
		promptpayTarget = '',
		feeStatus = 'owed' as CancellationFeeStatus,
		sessionLabel = '',
		submitAction = '/sessions?/submitFee',
		onClose,
		onSubmitted
	}: {
		open?: boolean;
		playerId: string;
		amount: number;
		promptpayTarget?: string | null;
		feeStatus?: CancellationFeeStatus;
		sessionLabel?: string;
		submitAction?: string;
		onClose: () => void;
		onSubmitted?: () => void;
	} = $props();

	let closeWarningOpen = $state(false);
	let submitLoading = $state(false);
	let slipFile = $state<File | null>(null);

	const target = $derived(promptpayTarget?.trim() ?? '');

	const requestClose = () => {
		if (feeStatus === 'owed') {
			closeWarningOpen = true;
			return;
		}
		onClose();
	};

	const confirmClose = () => {
		closeWarningOpen = false;
		onClose();
	};

	const handleSubmit: SubmitFunction = ({ formData, cancel }) => {
		if (!slipFile) {
			cancel();
			return;
		}

		formData.set('slip', slipFile);
		submitLoading = true;
		return async ({ result, update }) => {
			try {
				await update({ reset: false });
				if (result.type === 'success') {
					slipFile = null;
					onSubmitted?.();
				}
			} finally {
				submitLoading = false;
			}
		};
	};
</script>

<AppModal open={open && !closeWarningOpen} labelledBy="cancellation-fee-title" onClose={requestClose}>
	<div class="app-card-padded space-y-4">
		<h2 id="cancellation-fee-title" class="text-lg font-semibold text-slate-900">
			Pay cancellation fee
		</h2>
		{#if sessionLabel}
			<p class="text-sm text-slate-600">{sessionLabel}</p>
		{/if}
		<p class="text-sm text-slate-600">
			Transfer exactly {formatThb(amount)} using PromptPay, attach your bank slip, then tap “I've paid”.
		</p>

		{#if target}
			<PaymentQr target={target} {amount} label="Scan to pay cancellation fee" />
		{:else}
			<EmptyState message="Club PromptPay is not configured. Contact the admin." />
		{/if}

		{#if feeStatus === 'owed'}
			<SlipUploadField bind:file={slipFile} disabled={submitLoading} />
		{/if}

		{#if feeStatus === 'owed'}
			<form
				method="POST"
				action={submitAction}
				enctype="multipart/form-data"
				use:enhance={handleSubmit}
			>
				<input type="hidden" name="player_id" value={playerId} />
				<SubmitButton loading={submitLoading} disabled={!slipFile}>I've paid</SubmitButton>
			</form>
		{:else}
			<p class="text-center text-sm text-slate-600">{cancellationFeeStatusLabel(feeStatus)}</p>
		{/if}
	</div>
</AppModal>

<AppModal
	open={closeWarningOpen}
	labelledBy="cancellation-fee-close-title"
	onClose={() => (closeWarningOpen = false)}
>
	<div class="app-card-padded space-y-4">
		<h2 id="cancellation-fee-close-title" class="text-lg font-semibold text-slate-900">
			Leave without paying?
		</h2>
		<p class="text-sm text-slate-600">
			You will not be able to join any session until this cancellation fee is paid and confirmed
			by the admin.
		</p>
		<div class="flex flex-wrap gap-2">
			<SubmitButton type="button" variant="secondary" class="!w-auto" onclick={() => (closeWarningOpen = false)}>
				Keep paying
			</SubmitButton>
			<SubmitButton type="button" variant="ghost" class="!w-auto !text-red-700" onclick={confirmClose}>
				Close anyway
			</SubmitButton>
		</div>
	</div>
</AppModal>
