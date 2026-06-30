<script lang="ts">
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import DatePicker from '@repo/ui/components/DatePicker.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import Pagination from '@repo/ui/components/Pagination.svelte';
	import SelectMenu from '@repo/ui/components/SelectMenu.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import ChevronDownIcon from '@repo/ui/icons/ChevronDownIcon.svelte';
	import { formatDateTime } from '@repo/ui/datetime';
	import { formatThb } from '@repo/ui/payments';
	import SlipPreviewButton from '@repo/ui/components/SlipPreviewButton.svelte';
	import SlipPreviewModal from '@repo/ui/components/SlipPreviewModal.svelte';
	import {
		transactionKindBadgeClass,
		transactionStatusBadgeClass,
		transactionStatusFilterOptions,
		transactionStatusLabel,
		type TransactionKind
	} from '@repo/ui/transactions';
	import { adminRoleHeroBadgeClass } from '$lib/adminRoleHero';
	import { clubWorkspaceState } from '$lib/clubWorkspace.svelte';
	import {
		clubFilterOptions,
		countAdvancedFilters,
		emptyAdminTransactionFilters,
		filterAdminTransactions,
		filterAdminTransactionsByClub,
		playerFilterOptions,
		type AdminTransactionFilters
	} from '$lib/transactions/list';
	import { appRoleLabel, type AppRole } from '$lib/types/auth';
	import { paginate } from '@repo/ui/pagination';
	import { slipPreviewUrl } from '$lib/slips';
	import type { AdminTransaction } from '$lib/types/transaction';
	import type { LayoutData } from '../$types';
	import type { PageData } from './$types';

	let { data }: { data: PageData & LayoutData } = $props();

	let filters = $state<AdminTransactionFilters>(emptyAdminTransactionFilters());
	let showAdvanced = $state(false);
	let slipPreviewPath = $state<string | null>(null);
	let listPage = $state(1);

	const typeChipOptions: { value: '' | TransactionKind; label: string }[] = [
		{ value: '', label: 'All' },
		{ value: 'session_fee', label: 'Session fee' },
		{ value: 'cancellation_fee', label: 'Late cancel' }
	];

	const effectiveAppRole = $derived(data.effectiveAppRole ?? null);
	const roleLabel = $derived(
		effectiveAppRole ? appRoleLabel(effectiveAppRole as AppRole) : ''
	);
	const roleBadgeClass = $derived(adminRoleHeroBadgeClass(effectiveAppRole));
	const selectedClubId = $derived(clubWorkspaceState.selectedClubId);

	const scopedTransactions = $derived(
		data.isSuperAdmin
			? data.transactions
			: filterAdminTransactionsByClub(data.transactions, selectedClubId)
	);

	const clubOptions = $derived(clubFilterOptions(data.transactions));
	const playerOptions = $derived(playerFilterOptions(scopedTransactions));
	const filteredTransactions = $derived(filterAdminTransactions(scopedTransactions, filters));
	const pagedTransactions = $derived(paginate(filteredTransactions, listPage));
	const advancedFilterCount = $derived(countAdvancedFilters(filters));

	const hasActiveFilters = $derived(
		Boolean(
			filters.search.trim() ||
				filters.priceMin.trim() ||
				filters.priceMax.trim() ||
				filters.date ||
				filters.status ||
				filters.playerId ||
				filters.kind ||
				filters.clubId
		)
	);

	const clearFilters = () => {
		filters = emptyAdminTransactionFilters();
		showAdvanced = false;
	};

	const setKindFilter = (kind: '' | TransactionKind) => {
		filters = { ...filters, kind };
	};

	const playerLabel = (transaction: AdminTransaction): string => transaction.player_name;

	const kindShort = (kind: AdminTransaction['kind']): string =>
		kind === 'session_fee' ? 'Session fee' : 'Late cancel';

	$effect(() => {
		selectedClubId;
		scopedTransactions;
		filters;
		listPage = 1;
	});
</script>

<section class="space-y-5">
	<DashboardHero
		eyebrow="Payments"
		title="Payment transactions"
		tag={data.profile?.tag}
		roleLabel={roleLabel}
		roleBadgeClass={roleBadgeClass}
		subtitle={data.isSuperAdmin
			? 'Fees across all clubs.'
			: 'Session and late-cancellation fees.'}
	>
		{#if scopedTransactions.length > 0}
			<span class="app-hero-stat">
				{scopedTransactions.length} total
			</span>
			{#if hasActiveFilters && filteredTransactions.length !== scopedTransactions.length}
				<span class="app-hero-stat app-hero-stat--success">
					{filteredTransactions.length} matching
				</span>
			{/if}
		{/if}
	</DashboardHero>

	<div class="space-y-4">
		<div class="space-y-3">
			<label for="tx-search" class="sr-only">Search session or player</label>
			<input
				id="tx-search"
				type="search"
				bind:value={filters.search}
				placeholder="Search session or player"
				class="app-filter-input"
			/>

			<div class="flex flex-wrap gap-2" role="group" aria-label="Transaction type">
				{#each typeChipOptions as option (option.value)}
					<button
						type="button"
						class="rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition {filters.kind ===
						option.value
							? 'bg-brand-700 text-white ring-brand-700'
							: 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'}"
						aria-pressed={filters.kind === option.value}
						onclick={() => setKindFilter(option.value)}
					>
						{option.label}
					</button>
				{/each}
			</div>

			<div
				class="app-filter-toolbar grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
			>
				<div class="min-w-0">
					<SelectMenu
						id="tx-status"
						label="Status"
						options={transactionStatusFilterOptions}
						bind:value={filters.status}
					/>
				</div>
				<div class="min-w-0">
					<span class="app-filter-label invisible" aria-hidden="true">More filters</span>
					<button
						type="button"
						class="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
						aria-expanded={showAdvanced}
						aria-controls="tx-advanced-filters"
						onclick={() => {
							showAdvanced = !showAdvanced;
						}}
					>
						More filters
						{#if advancedFilterCount > 0}
							<span
								class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-100 px-1 text-xs font-semibold text-brand-800"
							>
								{advancedFilterCount}
							</span>
						{/if}
						<ChevronDownIcon
							class="h-4 w-4 shrink-0 transition {showAdvanced ? 'rotate-180' : ''}"
						/>
					</button>
				</div>
				{#if hasActiveFilters}
					<div class="col-span-2 min-w-0 sm:col-span-1">
						<span class="app-filter-label invisible" aria-hidden="true">Clear filters</span>
						<button
							type="button"
							class="flex h-11 w-full items-center justify-center px-3 text-sm font-medium text-brand-700 hover:text-brand-800"
							onclick={clearFilters}
						>
							Clear all
						</button>
					</div>
				{/if}
			</div>

			{#if showAdvanced}
				<div
					id="tx-advanced-filters"
					class="app-filter-toolbar grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:items-end"
				>
					<div class="min-w-0">
						<DatePicker id="tx-date" label="Date" variant="filter" bind:value={filters.date} />
					</div>
					<div class="min-w-0">
						<SelectMenu
							id="tx-player"
							label="Player"
							options={playerOptions}
							bind:value={filters.playerId}
						/>
					</div>
					<div class="min-w-0 {data.isSuperAdmin ? '' : 'col-span-2'}">
						<span class="app-filter-label">Price range (THB)</span>
						<div class="grid grid-cols-2 gap-2">
							<input
								id="tx-price-min"
								type="number"
								min="0"
								step="0.01"
								bind:value={filters.priceMin}
								placeholder="Min"
								aria-label="Minimum price in THB"
								class="app-filter-input"
							/>
							<input
								id="tx-price-max"
								type="number"
								min="0"
								step="0.01"
								bind:value={filters.priceMax}
								placeholder="Max"
								aria-label="Maximum price in THB"
								class="app-filter-input"
							/>
						</div>
					</div>
					{#if data.isSuperAdmin}
						<div class="min-w-0">
							<SelectMenu
								id="tx-club"
								label="Club"
								options={clubOptions}
								bind:value={filters.clubId}
							/>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		{#if scopedTransactions.length === 0}
			<EmptyState message="No payment transactions yet." />
		{:else if filteredTransactions.length === 0}
			<EmptyState message="No transactions match your filters.">
				<button
					type="button"
					class="text-sm font-medium text-brand-700 hover:text-brand-800"
					onclick={clearFilters}
				>
					Clear filters
				</button>
			</EmptyState>
		{:else}
			<ul class="space-y-2">
				{#each pagedTransactions.items as transaction (transaction.id)}
					<li
						class="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100"
					>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<p class="truncate font-medium text-slate-900">
										{playerLabel(transaction)}
									</p>
									{#if transaction.player_tag}
										<TagPill tag={transaction.player_tag} />
									{/if}
								</div>
								<p class="mt-0.5 truncate text-sm text-slate-600">
									{transaction.session_name}
								</p>
								<div class="mt-2 flex flex-wrap items-center gap-2">
									<span
										class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 {transactionKindBadgeClass(
											transaction.kind
										)}"
									>
										{kindShort(transaction.kind)}
									</span>
									<span
										class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 {transactionStatusBadgeClass(
											transaction.filter_status
										)}"
									>
										{transactionStatusLabel(transaction)}
									</span>
									<span class="text-xs text-slate-400">
										{formatDateTime(transaction.occurred_at)}
									</span>
									{#if data.isSuperAdmin}
										<span class="text-xs text-slate-400">{transaction.club_name}</span>
									{/if}
								</div>
							</div>
							<p class="shrink-0 text-base font-semibold tabular-nums text-slate-900">
								{formatThb(transaction.amount)}
							</p>
						</div>
						{#if transaction.slip_path}
							<div class="mt-2">
								<SlipPreviewButton
									onclick={() => (slipPreviewPath = transaction.slip_path)}
								/>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
			<Pagination
				page={pagedTransactions.page}
				totalPages={pagedTransactions.totalPages}
				hasPrev={pagedTransactions.hasPrev}
				hasNext={pagedTransactions.hasNext}
				onprev={() => (listPage -= 1)}
				onnext={() => (listPage += 1)}
			/>
		{/if}
	</div>
</section>

<SlipPreviewModal
	open={slipPreviewPath !== null}
	imageUrl={slipPreviewPath ? slipPreviewUrl(slipPreviewPath) : ''}
	onClose={() => (slipPreviewPath = null)}
/>
