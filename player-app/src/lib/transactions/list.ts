import type {
	PlayerTransaction,
	PlayerTransactionFilterStatus,
	PlayerTransactionKind
} from '$lib/types/transaction';
import {
	cancellationFilterStatus,
	dateFilterBounds,
	dateFilterEndIso,
	dateFilterStartIso,
	paymentFilterStatus,
	transactionKindLabel,
	transactionStatusBadgeClass,
	transactionStatusFilterOptions,
	transactionStatusLabel,
	type TransactionFilterStatus,
	type TransactionKind
} from '@repo/ui/transactions';

export {
	cancellationFilterStatus,
	dateFilterBounds,
	dateFilterEndIso,
	dateFilterStartIso,
	paymentFilterStatus,
	transactionKindLabel,
	transactionStatusBadgeClass,
	transactionStatusFilterOptions,
	transactionStatusLabel
};

export type { TransactionFilterStatus as PlayerTransactionFilterStatusKind, TransactionKind };

export const TRANSACTION_PAGE_SIZE = 10;

export const parseTransactionPage = (value: string | null): number =>
	Math.max(1, Number(value ?? '1') || 1);

export const parseTransactionDateFilter = (value: string | null): string => {
	if (!value) return '';
	return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
};

export const parseTransactionStatusFilter = (
	value: string | null
): PlayerTransactionFilterStatus => {
	const allowed = new Set(transactionStatusFilterOptions().map((option) => option.value));
	return allowed.has(value as PlayerTransactionFilterStatus)
		? (value as PlayerTransactionFilterStatus)
		: '';
};

export const filterTransactions = (
	transactions: PlayerTransaction[],
	statusFilter: PlayerTransactionFilterStatus
): PlayerTransaction[] => {
	if (!statusFilter) return transactions;
	return transactions.filter((transaction) => transaction.filter_status === statusFilter);
};
