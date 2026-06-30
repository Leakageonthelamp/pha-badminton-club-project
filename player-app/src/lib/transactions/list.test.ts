import { describe, expect, it } from 'vitest';
import {
	cancellationFilterStatus,
	filterTransactions,
	parseTransactionDateFilter,
	parseTransactionStatusFilter,
	paymentFilterStatus
} from './list';
import type { PlayerTransaction } from '$lib/types/transaction';

const baseTransaction = (
	overrides: Partial<PlayerTransaction> & Pick<PlayerTransaction, 'id' | 'filter_status'>
): PlayerTransaction => ({
	kind: 'session_fee',
	record_id: 'r1',
	session_id: 's1',
	session_name: 'Friday night',
	club_name: 'Test club',
	amount: 100,
	status: 'pending',
	occurred_at: '2026-06-29T12:00:00.000Z',
	session_start_at: '2026-06-29T10:00:00.000Z',
	slip_path: null,
	...overrides
});

describe('paymentFilterStatus', () => {
	it('maps payment statuses to filter buckets', () => {
		expect(paymentFilterStatus('pending')).toBe('pending');
		expect(paymentFilterStatus('submitted')).toBe('submitted');
		expect(paymentFilterStatus('approved')).toBe('completed');
	});
});

describe('cancellationFilterStatus', () => {
	it('maps cancellation statuses and ignores none', () => {
		expect(cancellationFilterStatus('owed')).toBe('pending');
		expect(cancellationFilterStatus('submitted')).toBe('submitted');
		expect(cancellationFilterStatus('paid')).toBe('completed');
		expect(cancellationFilterStatus('waived')).toBe('waived');
		expect(cancellationFilterStatus('none')).toBeNull();
	});
});

describe('filterTransactions', () => {
	it('returns all rows when status filter is empty', () => {
		const rows = [
			baseTransaction({ id: 'a', filter_status: 'pending' }),
			baseTransaction({ id: 'b', filter_status: 'completed' })
		];

		expect(filterTransactions(rows, '')).toHaveLength(2);
	});

	it('filters by unified status', () => {
		const rows = [
			baseTransaction({ id: 'a', filter_status: 'pending' }),
			baseTransaction({ id: 'b', filter_status: 'completed' })
		];

		expect(filterTransactions(rows, 'pending')).toEqual([rows[0]]);
	});
});

describe('parseTransactionDateFilter', () => {
	it('accepts YYYY-MM-DD only', () => {
		expect(parseTransactionDateFilter('2026-06-29')).toBe('2026-06-29');
		expect(parseTransactionDateFilter('bad')).toBe('');
		expect(parseTransactionDateFilter(null)).toBe('');
	});
});

describe('parseTransactionStatusFilter', () => {
	it('accepts known status filters only', () => {
		expect(parseTransactionStatusFilter('submitted')).toBe('submitted');
		expect(parseTransactionStatusFilter('unknown')).toBe('');
	});
});
