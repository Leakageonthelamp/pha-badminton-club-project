import {
	cancellationFeeStatusLabel,
	paymentStatusLabel,
	type CancellationFeeStatus,
	type PaymentStatus
} from '@repo/ui/payments';
import type {
	PlayerTransaction,
	PlayerTransactionFilterStatus,
	PlayerTransactionKind
} from '$lib/types/transaction';

export const TRANSACTION_PAGE_SIZE = 10;

export const transactionStatusFilterOptions: { value: PlayerTransactionFilterStatus; label: string }[] =
	[
		{ value: '', label: 'All statuses' },
		{ value: 'pending', label: 'Pending payment' },
		{ value: 'submitted', label: 'Awaiting confirmation' },
		{ value: 'completed', label: 'Paid' },
		{ value: 'waived', label: 'Waived' }
	];

export const transactionKindLabel = (kind: PlayerTransactionKind): string =>
	kind === 'session_fee' ? 'Session fee' : 'Cancellation fee';

export const paymentFilterStatus = (status: PaymentStatus): PlayerTransaction['filter_status'] => {
	switch (status) {
		case 'pending':
			return 'pending';
		case 'submitted':
			return 'submitted';
		case 'approved':
			return 'completed';
	}
};

export const cancellationFilterStatus = (
	status: CancellationFeeStatus
): PlayerTransaction['filter_status'] | null => {
	switch (status) {
		case 'owed':
			return 'pending';
		case 'submitted':
			return 'submitted';
		case 'paid':
			return 'completed';
		case 'waived':
			return 'waived';
		default:
			return null;
	}
};

export const transactionStatusLabel = (transaction: PlayerTransaction): string =>
	transaction.kind === 'session_fee'
		? paymentStatusLabel(transaction.status as PaymentStatus)
		: cancellationFeeStatusLabel(transaction.status as CancellationFeeStatus);

export const transactionStatusBadgeClass = (filterStatus: PlayerTransaction['filter_status']): string => {
	switch (filterStatus) {
		case 'pending':
			return 'bg-amber-50 text-amber-800 ring-amber-100';
		case 'submitted':
			return 'bg-sky-50 text-sky-700 ring-sky-100';
		case 'completed':
			return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
		case 'waived':
			return 'bg-slate-100 text-slate-600 ring-slate-200';
	}
};

export const parseTransactionPage = (value: string | null): number =>
	Math.max(1, Number(value ?? '1') || 1);

export const parseTransactionDateFilter = (value: string | null): string => {
	if (!value) return '';
	return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
};

export const parseTransactionStatusFilter = (
	value: string | null
): PlayerTransactionFilterStatus => {
	const allowed = new Set(transactionStatusFilterOptions.map((option) => option.value));
	return allowed.has(value as PlayerTransactionFilterStatus)
		? (value as PlayerTransactionFilterStatus)
		: '';
};

export const dateFilterStartIso = (date: string): string => `${date}T00:00:00.000Z`;

export const dateFilterEndIso = (date: string): string => `${date}T23:59:59.999Z`;

export const dateFilterBounds = (
	date: string
): { fromIso: string; toIso: string } | null => {
	if (!date) return null;
	return {
		fromIso: dateFilterStartIso(date),
		toIso: dateFilterEndIso(date)
	};
};

export const filterTransactions = (
	transactions: PlayerTransaction[],
	statusFilter: PlayerTransactionFilterStatus
): PlayerTransaction[] => {
	if (!statusFilter) return transactions;
	return transactions.filter((transaction) => transaction.filter_status === statusFilter);
};
