<script lang="ts">
	import { navigating } from '$app/state';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import Pagination from '@repo/ui/components/Pagination.svelte';
	import DashboardIcon from '@repo/ui/components/DashboardIcon.svelte';
	import DatePicker from '@repo/ui/components/DatePicker.svelte';
	import SelectMenu from '@repo/ui/components/SelectMenu.svelte';
	import BanknotesIcon from '@repo/ui/icons/BanknotesIcon.svelte';
	import SearchIcon from '@repo/ui/icons/SearchIcon.svelte';
	import { formatDate } from '@repo/ui/datetime';
	import { formatThb } from '@repo/ui/payments';
	import SlipPreviewButton from '@repo/ui/components/SlipPreviewButton.svelte';
	import SlipPreviewModal from '@repo/ui/components/SlipPreviewModal.svelte';
	import type { PlayerTransaction, PlayerTransactionPage } from '$lib/types/transaction';
	import { slipPreviewUrl } from '$lib/slips';
	import {
		transactionStatusBadgeClass,
		transactionStatusFilterOptions,
		transactionStatusLabel
	} from '$lib/transactions/list';

	let {
		transactions,
		onOpenCancellationFee
	}: {
		transactions: PlayerTransactionPage;
		onOpenCancellationFee?: (playerId: string) => void;
	} = $props();

	let statusFilter = $state('');
	let dateFilter = $state('');
	let slipPreviewPath = $state<string | null>(null);

	const isFetching = $derived(
		navigating.to !== null && navigating.to.url.pathname === '/profile'
	);

	const hasActiveFilters = $derived(
		Boolean(transactions.statusFilter || transactions.date)
	);

	const isFilteredEmpty = $derived(hasActiveFilters && transactions.items.length === 0);

	$effect(() => {
		statusFilter = transactions.statusFilter;
		dateFilter = transactions.date;
	});

	const buildPageUrl = (page: number): string => {
		const params = new URLSearchParams();
		if (transactions.statusFilter) params.set('txStatus', transactions.statusFilter);
		if (transactions.date) params.set('txDate', transactions.date);
		if (page > 1) params.set('txPage', String(page));
		const query = params.toString();
		return query ? `/profile?${query}` : '/profile';
	};

	const canPreviewSlip = (transaction: PlayerTransaction): boolean =>
		Boolean(transaction.slip_path);

	const canOpenCancellationFee = (transaction: PlayerTransaction): boolean =>
		transaction.kind === 'cancellation_fee' &&
		(transaction.filter_status === 'pending' || transaction.filter_status === 'submitted');

	const kindShort = (kind: PlayerTransaction['kind']): string =>
		kind === 'session_fee' ? 'Session' : 'Late cancel';

	const metaLine = (transaction: PlayerTransaction): string =>
		`${transaction.club_name} · ${kindShort(transaction.kind)} · ${formatDate(transaction.session_start_at)}`;
</script>

{#snippet transactionRow(transaction: PlayerTransaction)}
	<div class="space-y-2">
		<div class="flex min-w-0 items-start gap-3">
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-medium text-slate-900">{transaction.session_name}</p>
				<p class="truncate text-xs text-slate-500">{metaLine(transaction)}</p>
			</div>
			<div class="flex shrink-0 flex-col items-end gap-1">
				<p class="text-sm font-semibold tabular-nums text-slate-900">{formatThb(transaction.amount)}</p>
				<span
					class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 {transactionStatusBadgeClass(
						transaction.filter_status
					)}"
				>
					{transactionStatusLabel(transaction)}
				</span>
			</div>
		</div>
		{#if canPreviewSlip(transaction)}
			<SlipPreviewButton
				label="Slip"
				onclick={() => (slipPreviewPath = transaction.slip_path)}
			/>
		{/if}
	</div>
{/snippet}

<AppCard class="space-y-3">
	<div class="flex items-baseline justify-between gap-3">
		<h2 class="font-medium text-slate-900">Payment history</h2>
		{#if !isFetching && transactions.totalCount > 0}
			<span class="text-xs text-slate-500">{transactions.totalCount} total</span>
		{/if}
	</div>

	<form method="GET" action="/profile" class="app-filter-row">
		<DatePicker id="tx-date" label="Date" variant="filter" bind:value={dateFilter} />
		<input type="hidden" name="txDate" value={dateFilter} />
		<div class="min-w-0">
			<SelectMenu
				id="tx-status"
				label="Status"
				options={transactionStatusFilterOptions}
				bind:value={statusFilter}
			/>
			<input type="hidden" name="txStatus" value={statusFilter} />
		</div>
		<div class="app-filter-submit-wrap">
			<span class="app-filter-label invisible" aria-hidden="true">Filter</span>
			<button
				type="submit"
				class="app-filter-submit"
				aria-label="Filter transactions"
				title="Filter"
				disabled={isFetching}
				aria-busy={isFetching}
			>
				{#if isFetching}
					<span
						class="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700"
						aria-hidden="true"
					></span>
				{:else}
					<SearchIcon class="h-5 w-5 text-brand-700" />
				{/if}
			</button>
		</div>
	</form>

	{#if hasActiveFilters && !isFetching}
		<p class="text-xs text-slate-500">
			Filtered
			{#if transactions.date}
				· {transactions.date}
			{/if}
			{#if transactions.statusFilter}
				· {transactionStatusFilterOptions.find((option) => option.value === transactions.statusFilter)?.label ??
					transactions.statusFilter}
			{/if}
		</p>
	{/if}

	{#if isFetching}
		<ul class="divide-y divide-slate-100 rounded-lg border border-slate-200" aria-busy="true">
			{#each Array(3) as _, index (index)}
				<li class="px-3 py-2.5">
					<div class="app-skeleton h-3.5 w-36 max-w-full rounded"></div>
				</li>
			{/each}
		</ul>
	{:else if transactions.items.length === 0}
		<div
			class="rounded-xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50/90 to-white px-4 py-8 text-center"
		>
			<DashboardIcon icon={isFilteredEmpty ? SearchIcon : BanknotesIcon} accent="indigo" class="mx-auto" />
			{#if isFilteredEmpty}
				<p class="mt-3 text-sm font-medium text-slate-900">No transactions match your filters</p>
				<p class="mx-auto mt-1 max-w-xs text-sm text-slate-500">
					Try another date or status, or reset to see your full payment history.
				</p>
				<a href="/profile" class="mt-4 inline-flex text-sm font-medium text-brand-700 hover:text-brand-800">
					Clear filters
				</a>
			{:else}
				<p class="mt-3 text-sm font-medium text-slate-900">No payments yet</p>
				<p class="mx-auto mt-1 max-w-xs text-sm text-slate-500">
					Session fees and late-cancellation charges show up here after you join a game.
				</p>
				<a
					href="/sessions"
					class="mt-4 inline-flex text-sm font-medium text-brand-700 hover:text-brand-800"
				>
					Browse sessions →
				</a>
			{/if}
		</div>
	{:else}
		<ul class="divide-y divide-slate-100 rounded-lg border border-slate-200">
			{#each transactions.items as transaction (transaction.id)}
				<li class="px-3 py-3">
					{#if canOpenCancellationFee(transaction) && onOpenCancellationFee}
						<button
							type="button"
							class="w-full text-left"
							onclick={() => onOpenCancellationFee(transaction.record_id)}
						>
							{@render transactionRow(transaction)}
						</button>
					{:else}
						{@render transactionRow(transaction)}
					{/if}
				</li>
			{/each}
		</ul>

		<Pagination
			page={transactions.page}
			hasPrev={transactions.hasPrevPage}
			hasNext={transactions.hasNextPage}
			prevHref={transactions.hasPrevPage ? buildPageUrl(transactions.page - 1) : undefined}
			nextHref={transactions.hasNextPage ? buildPageUrl(transactions.page + 1) : undefined}
			size="xs"
		/>
	{/if}
</AppCard>

<SlipPreviewModal
	open={slipPreviewPath !== null}
	imageUrl={slipPreviewPath ? slipPreviewUrl(slipPreviewPath) : ''}
	onClose={() => (slipPreviewPath = null)}
/>
