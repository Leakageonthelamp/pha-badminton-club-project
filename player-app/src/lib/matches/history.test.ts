import { describe, expect, it } from 'vitest';
import {
	computeMatchSummary,
	filterSortPaginateMatchHistory,
	parseHistoryDate,
	parseHistoryPage,
	parseHistorySession,
	parseResultFilter
} from './history';
import type { MatchHistoryItem } from '$lib/types/match';

const baseItem = (
	overrides: Partial<MatchHistoryItem> & Pick<MatchHistoryItem, 'id' | 'ended_at'>
): MatchHistoryItem => ({
	session_id: 'session-1',
	session_name: 'Friday night',
	session_start_at: '2026-06-29T10:00:00.000Z',
	club_id: 'club-1',
	club_name: 'Test club',
	court_number: 1,
	status: 'completed',
	match_mode: 'manual',
	round_type: 'one_round',
	score_type: 21,
	shuttles_used: 2,
	invite_expires_at: null,
	score_submitted_by: null,
	created_by: null,
	started_at: '2026-06-29T10:00:00.000Z',
	created_at: '2026-06-29T09:55:00.000Z',
	updated_at: '2026-06-29T10:30:00.000Z',
	players: [],
	games: [],
	result: 'win',
	score: '21-18',
	durationMs: 1_800_000,
	...overrides
});

describe('computeMatchSummary', () => {
	it('totals wins, losses, win rate, avg duration, and shuttles', () => {
		const items = [
			baseItem({ id: 'a', ended_at: '2026-06-29T10:30:00.000Z', result: 'win', durationMs: 1_200_000, shuttles_used: 2 }),
			baseItem({ id: 'b', ended_at: '2026-06-28T10:30:00.000Z', result: 'lose', durationMs: 1_800_000, shuttles_used: 3 }),
			baseItem({ id: 'c', ended_at: '2026-06-27T10:30:00.000Z', result: 'win', durationMs: 600_000, shuttles_used: 1 })
		];

		const summary = computeMatchSummary(items);

		expect(summary.totalMatches).toBe(3);
		expect(summary.wins).toBe(2);
		expect(summary.losses).toBe(1);
		expect(summary.winRate).toBe(67);
		expect(summary.avgDurationMs).toBe(1_200_000);
		expect(summary.totalShuttles).toBe(6);
	});
});

describe('filterSortPaginateMatchHistory', () => {
	const summary = computeMatchSummary([]);

	it('sorts by ended_at descending', () => {
		const items = [
			baseItem({ id: 'a', ended_at: '2026-06-01T10:30:00.000Z' }),
			baseItem({ id: 'b', ended_at: '2026-06-29T10:30:00.000Z' }),
			baseItem({ id: 'c', ended_at: '2026-06-15T10:30:00.000Z' })
		];

		const result = filterSortPaginateMatchHistory(items, {
			resultFilter: '',
			page: 1,
			summary
		});

		expect(result.items.map((item) => item.id)).toEqual(['b', 'c', 'a']);
	});

	it('filters by result and session', () => {
		const items = [
			baseItem({
				id: 'a',
				ended_at: '2026-06-29T10:30:00.000Z',
				result: 'win',
				session_id: 'session-a'
			}),
			baseItem({
				id: 'b',
				ended_at: '2026-06-28T10:30:00.000Z',
				result: 'lose',
				session_id: 'session-b',
				session_name: 'Other session'
			})
		];

		const byResult = filterSortPaginateMatchHistory(items, {
			resultFilter: 'win',
			page: 1,
			summary
		});
		expect(byResult.items).toHaveLength(1);
		expect(byResult.items[0]?.id).toBe('a');

		const bySession = filterSortPaginateMatchHistory(items, {
			resultFilter: '',
			sessionFilter: 'session-b',
			page: 1,
			summary
		});
		expect(bySession.items).toHaveLength(1);
		expect(bySession.items[0]?.id).toBe('b');
	});

	it('filters by date on ended_at', () => {
		const items = [
			baseItem({ id: 'a', ended_at: '2026-06-29T10:30:00.000Z' }),
			baseItem({ id: 'b', ended_at: '2026-06-28T10:30:00.000Z' })
		];

		const result = filterSortPaginateMatchHistory(items, {
			resultFilter: '',
			page: 1,
			date: '2026-06-29',
			summary
		});

		expect(result.items).toHaveLength(1);
		expect(result.items[0]?.id).toBe('a');
	});

	it('paginates results', () => {
		const items = Array.from({ length: 12 }, (_, index) =>
			baseItem({
				id: `m${index}`,
				ended_at: new Date(Date.UTC(2026, 5, 30 - index, 10, 30)).toISOString()
			})
		);

		const page1 = filterSortPaginateMatchHistory(items, { resultFilter: '', page: 1, summary });
		const page2 = filterSortPaginateMatchHistory(items, { resultFilter: '', page: 2, summary });

		expect(page1.items).toHaveLength(10);
		expect(page1.hasNextPage).toBe(true);
		expect(page2.items).toHaveLength(2);
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

describe('parseResultFilter', () => {
	it('accepts known result filters only', () => {
		expect(parseResultFilter('win')).toBe('win');
		expect(parseResultFilter('lose')).toBe('lose');
		expect(parseResultFilter('unknown')).toBe('');
	});
});

describe('parseHistoryPage', () => {
	it('defaults to 1 and rejects invalid values', () => {
		expect(parseHistoryPage(null)).toBe(1);
		expect(parseHistoryPage('0')).toBe(1);
		expect(parseHistoryPage('2')).toBe(2);
	});
});

describe('parseHistorySession', () => {
	it('accepts known session ids only', () => {
		const allowed = new Set(['session-a', 'session-b']);
		expect(parseHistorySession('session-a', allowed)).toBe('session-a');
		expect(parseHistorySession('unknown', allowed)).toBe('');
		expect(parseHistorySession(null, allowed)).toBe('');
	});
});
