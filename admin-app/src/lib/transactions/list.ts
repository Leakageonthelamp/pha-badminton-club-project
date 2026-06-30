import type { AdminTransaction } from '$lib/types/transaction';
import { occurredOnDate, type TransactionFilterStatus, type TransactionKind } from '@repo/ui/transactions';

export type AdminTransactionFilters = {
	search: string;
	priceMin: string;
	priceMax: string;
	date: string;
	status: TransactionFilterStatus;
	playerId: string;
	kind: '' | TransactionKind;
	clubId: string;
};

export const emptyAdminTransactionFilters = (): AdminTransactionFilters => ({
	search: '',
	priceMin: '',
	priceMax: '',
	date: '',
	status: '',
	playerId: '',
	kind: '',
	clubId: ''
});

const matchesSearch = (transaction: AdminTransaction, query: string): boolean => {
	if (!query) return true;

	const sessionMatch = transaction.session_name.toLowerCase().includes(query);
	const playerMatch = [transaction.player_name, transaction.player_tag ?? '']
		.join(' ')
		.toLowerCase()
		.includes(query);

	return sessionMatch || playerMatch;
};

export const countAdvancedFilters = (filters: AdminTransactionFilters): number => {
	let count = 0;
	if (filters.priceMin.trim()) count += 1;
	if (filters.priceMax.trim()) count += 1;
	if (filters.date) count += 1;
	if (filters.playerId) count += 1;
	if (filters.clubId) count += 1;
	return count;
};

export const clubFilterOptions = (
	transactions: AdminTransaction[]
): { value: string; label: string }[] => {
	const clubs = new Map<string, string>();
	for (const transaction of transactions) {
		if (transaction.club_id) {
			clubs.set(transaction.club_id, transaction.club_name);
		}
	}

	return [
		{ value: '', label: 'All clubs' },
		...Array.from(clubs.entries())
			.sort((a, b) => a[1].localeCompare(b[1]))
			.map(([value, label]) => ({ value, label }))
	];
};

export const playerFilterOptions = (
	transactions: AdminTransaction[]
): { value: string; label: string }[] => {
	const players = new Map<string, string>();
	for (const transaction of transactions) {
		const label = transaction.player_tag
			? `${transaction.player_name} (@${transaction.player_tag})`
			: transaction.player_name;
		players.set(transaction.player_id, label);
	}

	return [
		{ value: '', label: 'All players' },
		...Array.from(players.entries())
			.sort((a, b) => a[1].localeCompare(b[1]))
			.map(([value, label]) => ({ value, label }))
	];
};

const parsePrice = (value: string): number | null => {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export const filterAdminTransactions = (
	transactions: AdminTransaction[],
	filters: AdminTransactionFilters
): AdminTransaction[] => {
	const searchQuery = filters.search.trim().toLowerCase();
	const priceMin = parsePrice(filters.priceMin);
	const priceMax = parsePrice(filters.priceMax);

	return transactions.filter((transaction) => {
		if (!matchesSearch(transaction, searchQuery)) {
			return false;
		}

		if (priceMin !== null && transaction.amount < priceMin) {
			return false;
		}

		if (priceMax !== null && transaction.amount > priceMax) {
			return false;
		}

		if (!occurredOnDate(transaction.occurred_at, filters.date)) {
			return false;
		}

		if (filters.status && transaction.filter_status !== filters.status) {
			return false;
		}

		if (filters.playerId && transaction.player_id !== filters.playerId) {
			return false;
		}

		if (filters.kind && transaction.kind !== filters.kind) {
			return false;
		}

		if (filters.clubId && transaction.club_id !== filters.clubId) {
			return false;
		}

		return true;
	});
};

export const filterAdminTransactionsByClub = (
	transactions: AdminTransaction[],
	clubId: string
): AdminTransaction[] => {
	if (!clubId) return transactions;
	return transactions.filter((transaction) => transaction.club_id === clubId);
};

export type AdminTransactionSummary = {
	totalIncome: number;
	sessionFeeIncome: number;
	lateCancelIncome: number;
	unpaidCount: number;
};

export const summarizeAdminTransactions = (
	transactions: AdminTransaction[]
): AdminTransactionSummary => {
	let sessionFeeIncome = 0;
	let lateCancelIncome = 0;
	let unpaidCount = 0;

	for (const transaction of transactions) {
		if (transaction.filter_status === 'completed') {
			if (transaction.kind === 'session_fee') {
				sessionFeeIncome += transaction.amount;
			} else {
				lateCancelIncome += transaction.amount;
			}
		} else if (
			transaction.filter_status === 'pending' ||
			transaction.filter_status === 'submitted'
		) {
			unpaidCount += 1;
		}
	}

	return {
		sessionFeeIncome,
		lateCancelIncome,
		totalIncome: sessionFeeIncome + lateCancelIncome,
		unpaidCount
	};
};
