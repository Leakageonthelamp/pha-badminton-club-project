import { describe, expect, it } from 'vitest';
import {
	filterSortPaginateHistory,
	parseHistoryClub,
	parseHistoryDate,
	parseHistoryPage,
	parseHistoryStatus
} from './history';
import type { SessionHistoryItem } from '$lib/types/session';

const baseItem = (
	overrides: Partial<SessionHistoryItem> & Pick<SessionHistoryItem, 'id' | 'start_at'>
): SessionHistoryItem => ({
	name: 'Friday night',
	club_id: 'club-1',
	club_name: 'Test club',
	status: 'closed',
	end_at: '2026-06-29T14:00:00.000Z',
	membership_status: 'confirmed',
	...overrides
});

describe('filterSortPaginateHistory', () => {
	it('sorts by start_at descending (latest first)', () => {
		const items = [
			baseItem({ id: 'a', start_at: '2026-06-01T10:00:00.000Z' }),
			baseItem({ id: 'b', start_at: '2026-06-29T10:00:00.000Z' }),
			baseItem({ id: 'c', start_at: '2026-06-15T10:00:00.000Z' })
		];

		const result = filterSortPaginateHistory(items, { statusFilter: '', page: 1 });

		expect(result.items.map((item) => item.id)).toEqual(['b', 'c', 'a']);
	});

	it('filters by session status', () => {
		const items = [
			baseItem({ id: 'a', start_at: '2026-06-29T10:00:00.000Z', status: 'closed' }),
			baseItem({ id: 'b', start_at: '2026-06-28T10:00:00.000Z', status: 'cancelled' })
		];

		const result = filterSortPaginateHistory(items, { statusFilter: 'closed', page: 1 });

		expect(result.items).toHaveLength(1);
		expect(result.items[0]?.id).toBe('a');
		expect(result.totalCount).toBe(1);
	});

	it('filters by club', () => {
		const items = [
			baseItem({ id: 'a', start_at: '2026-06-29T10:00:00.000Z', club_id: 'club-a' }),
			baseItem({
				id: 'b',
				start_at: '2026-06-28T10:00:00.000Z',
				club_id: 'club-b',
				club_name: 'Other club'
			})
		];

		const result = filterSortPaginateHistory(items, {
			statusFilter: '',
			clubFilter: 'club-b',
			page: 1
		});

		expect(result.items).toHaveLength(1);
		expect(result.items[0]?.id).toBe('b');
	});

	it('paginates results', () => {
		const items = Array.from({ length: 12 }, (_, index) =>
			baseItem({
				id: `s${index}`,
				start_at: new Date(Date.UTC(2026, 5, 30 - index)).toISOString()
			})
		);

		const page1 = filterSortPaginateHistory(items, { statusFilter: '', page: 1 });
		const page2 = filterSortPaginateHistory(items, { statusFilter: '', page: 2 });

		expect(page1.items).toHaveLength(10);
		expect(page1.hasNextPage).toBe(true);
		expect(page1.hasPrevPage).toBe(false);
		expect(page2.items).toHaveLength(2);
		expect(page2.hasNextPage).toBe(false);
		expect(page2.hasPrevPage).toBe(true);
	});
});

describe('parseHistoryDate', () => {
	it('accepts YYYY-MM-DD only', () => {
		expect(parseHistoryDate('2026-06-29')).toBe('2026-06-29');
		expect(parseHistoryDate('bad')).toBe('');
		expect(parseHistoryDate(null)).toBe('');
	});
});

describe('parseHistoryStatus', () => {
	it('accepts known status filters only', () => {
		expect(parseHistoryStatus('closed')).toBe('closed');
		expect(parseHistoryStatus('draft')).toBe('');
		expect(parseHistoryStatus('unknown')).toBe('');
	});
});

describe('parseHistoryPage', () => {
	it('defaults to 1 and rejects invalid values', () => {
		expect(parseHistoryPage(null)).toBe(1);
		expect(parseHistoryPage('0')).toBe(1);
		expect(parseHistoryPage('2')).toBe(2);
	});
});

describe('parseHistoryClub', () => {
	it('accepts known club ids only', () => {
		const allowed = new Set(['club-a', 'club-b']);
		expect(parseHistoryClub('club-a', allowed)).toBe('club-a');
		expect(parseHistoryClub('unknown', allowed)).toBe('');
		expect(parseHistoryClub(null, allowed)).toBe('');
	});
});
