import { describe, expect, it } from 'vitest';
import {
	countAdvancedFilters,
	emptyAdminTransactionFilters,
	filterAdminTransactions,
	filterAdminTransactionsByClub
} from './list';
import type { AdminTransaction } from '$lib/types/transaction';

const baseTransaction = (
	overrides: Partial<AdminTransaction> & Pick<AdminTransaction, 'id'>
): AdminTransaction => ({
	kind: 'session_fee',
	record_id: 'r1',
	session_id: 's1',
	session_name: 'Friday night',
	session_start_at: '2026-06-29T10:00:00.000Z',
	club_id: 'c1',
	club_name: 'Test club',
	player_id: 'p1',
	player_name: 'Alice',
	player_tag: 'alice',
	amount: 150,
	status: 'pending',
	filter_status: 'pending',
	occurred_at: '2026-06-29T12:00:00.000Z',
	slip_path: null,
	...overrides
});

describe('filterAdminTransactions', () => {
	const rows = [
		baseTransaction({ id: 'a', session_name: 'Friday night', amount: 150, kind: 'session_fee' }),
		baseTransaction({
			id: 'b',
			session_name: 'Saturday open',
			amount: 80,
			kind: 'cancellation_fee',
			filter_status: 'completed',
			status: 'paid',
			player_id: 'p2',
			player_name: 'Bob',
			player_tag: null,
			occurred_at: '2026-06-30T08:00:00.000Z',
			club_id: 'c2',
			club_name: 'Other club'
		})
	];

	it('returns all rows when filters are empty', () => {
		expect(filterAdminTransactions(rows, emptyAdminTransactionFilters())).toHaveLength(2);
	});

	it('filters by session name via search', () => {
		const filtered = filterAdminTransactions(rows, {
			...emptyAdminTransactionFilters(),
			search: 'saturday'
		});
		expect(filtered).toEqual([rows[1]]);
	});

	it('filters by player name via search', () => {
		const filtered = filterAdminTransactions(rows, {
			...emptyAdminTransactionFilters(),
			search: 'bob'
		});
		expect(filtered).toEqual([rows[1]]);
	});

	it('filters by price range', () => {
		const filtered = filterAdminTransactions(rows, {
			...emptyAdminTransactionFilters(),
			priceMin: '100',
			priceMax: '200'
		});
		expect(filtered).toEqual([rows[0]]);
	});

	it('filters by date', () => {
		const filtered = filterAdminTransactions(rows, {
			...emptyAdminTransactionFilters(),
			date: '2026-06-30'
		});
		expect(filtered).toEqual([rows[1]]);
	});

	it('filters by status', () => {
		const filtered = filterAdminTransactions(rows, {
			...emptyAdminTransactionFilters(),
			status: 'completed'
		});
		expect(filtered).toEqual([rows[1]]);
	});

	it('filters by player id', () => {
		const filtered = filterAdminTransactions(rows, {
			...emptyAdminTransactionFilters(),
			playerId: 'p2'
		});
		expect(filtered).toEqual([rows[1]]);
	});

	it('filters by transaction kind', () => {
		const filtered = filterAdminTransactions(rows, {
			...emptyAdminTransactionFilters(),
			kind: 'cancellation_fee'
		});
		expect(filtered).toEqual([rows[1]]);
	});

	it('filters by club id', () => {
		const filtered = filterAdminTransactions(rows, {
			...emptyAdminTransactionFilters(),
			clubId: 'c2'
		});
		expect(filtered).toEqual([rows[1]]);
	});
});

describe('countAdvancedFilters', () => {
	it('counts only advanced filter fields', () => {
		expect(countAdvancedFilters(emptyAdminTransactionFilters())).toBe(0);
		expect(
			countAdvancedFilters({
				...emptyAdminTransactionFilters(),
				search: 'foo',
				status: 'pending',
				kind: 'session_fee',
				date: '2026-06-29',
				priceMin: '100'
			})
		).toBe(2);
	});
});

describe('filterAdminTransactionsByClub', () => {
	it('returns rows for the selected club only', () => {
		const rows = [
			baseTransaction({ id: 'a', club_id: 'c1' }),
			baseTransaction({ id: 'b', club_id: 'c2' })
		];

		expect(filterAdminTransactionsByClub(rows, 'c1')).toEqual([rows[0]]);
	});
});
