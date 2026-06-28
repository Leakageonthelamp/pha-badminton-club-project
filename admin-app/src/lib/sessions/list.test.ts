import { describe, expect, it } from 'vitest';
import {
	filterActiveSessions,
	filterDraftSessions,
	filterHistorySessions,
	filterOngoingSessions,
	filterUpcomingSessions,
	isDraftOpenWindowOpen,
	isHistorySession,
	isSessionMutable,
	isUpcomingSession
} from './list';
import type { SessionListItem } from '$lib/types/session';

const baseSession = (overrides: Partial<SessionListItem>): SessionListItem => ({
	id: '1',
	club_id: 'club-1',
	host_id: 'host-1',
	name: 'Friday Night',
	description: '',
	status: 'open',
	start_at: '2026-07-01T10:00:00.000Z',
	end_at: '2026-07-01T14:00:00.000Z',
	finished_at: null,
	venue_name: 'Court A',
	latitude: null,
	longitude: null,
	max_players: 12,
	min_players: 4,
	court_count: 2,
	court_fee_per_hour: 200,
	shuttle_id: null,
	shuttle_price_per_each: 80,
	match_score_type: 21,
	match_type: 'one_round',
	cancellation_fee: 0,
	max_buffer: 0,
	promptpay_type: null,
	promptpay_target: null,
	cancel_source: null,
	cancel_reason: null,
	cancelled_by: null,
	created_at: '2026-06-01T00:00:00.000Z',
	updated_at: '2026-06-01T00:00:00.000Z',
	club: { id: 'club-1', name: 'Test Club' },
	host: { id: 'host-1', display_name: 'Admin', tag: '#abcd' },
	...overrides
});

describe('session list filters', () => {
	it('treats open sessions as upcoming', () => {
		const session = baseSession({ status: 'open' });
		expect(isUpcomingSession(session, Date.parse('2026-06-01T00:00:00.000Z'))).toBe(true);
	});

	it('filters draft sessions by status and start time', () => {
		const sessions = filterDraftSessions([
			baseSession({ id: '1', status: 'draft', start_at: '2026-07-02T10:00:00.000Z' }),
			baseSession({ id: '2', status: 'open' }),
			baseSession({ id: '3', status: 'draft', start_at: '2026-07-01T10:00:00.000Z' }),
			baseSession({
				id: '4',
				status: 'draft',
				start_at: '2026-05-01T10:00:00.000Z',
				end_at: '2026-05-01T14:00:00.000Z'
			})
		]);

		expect(sessions.map((session) => session.id)).toEqual(['3', '1']);
	});

	it('excludes draft sessions from upcoming', () => {
		const session = baseSession({ status: 'draft' });
		expect(isUpcomingSession(session)).toBe(false);
	});

	it('includes draft, open, and in_progress in active sessions', () => {
		const sessions = filterActiveSessions([
			baseSession({ id: '1', status: 'draft' }),
			baseSession({ id: '2', status: 'open' }),
			baseSession({ id: '3', status: 'in_progress' }),
			baseSession({ id: '4', status: 'closed' }),
			baseSession({ id: '5', status: 'cancelled' })
		]);

		expect(sessions.map((session) => session.id)).toEqual(['1', '2', '3']);
	});

	it('treats closed sessions as history only', () => {
		const session = baseSession({ status: 'closed' });
		expect(isHistorySession(session)).toBe(true);
		expect(isUpcomingSession(session)).toBe(false);
	});

	it('sorts history newest first', () => {
		const sessions = filterHistorySessions([
			baseSession({ id: '1', status: 'closed', start_at: '2026-05-01T10:00:00.000Z' }),
			baseSession({ id: '2', status: 'cancelled', start_at: '2026-06-01T10:00:00.000Z' })
		]);

		expect(sessions.map((session) => session.id)).toEqual(['2', '1']);
	});

	it('filters upcoming sessions', () => {
		const sessions = filterUpcomingSessions([
			baseSession({ id: '1', status: 'open' }),
			baseSession({ id: '2', status: 'closed' }),
			baseSession({ id: '3', status: 'draft' })
		]);

		expect(sessions).toHaveLength(1);
		expect(sessions[0]?.id).toBe('1');
	});

	it('excludes in_progress from upcoming and filters ongoing sessions', () => {
		const sessions = [
			baseSession({ id: '1', status: 'open' }),
			baseSession({ id: '2', status: 'in_progress' }),
			baseSession({ id: '3', status: 'closed' })
		];

		expect(isUpcomingSession(sessions[1]!)).toBe(false);
		expect(filterUpcomingSessions(sessions).map((session) => session.id)).toEqual(['1']);
		expect(filterOngoingSessions(sessions).map((session) => session.id)).toEqual(['2']);
	});

	it('allows opening a draft until start minus 1 hour', () => {
		const startAt = '2026-07-01T10:00:00.000Z';
		const openAtStartMinus90 = Date.parse('2026-07-01T08:30:00.000Z');
		const openAtStartMinus30 = Date.parse('2026-07-01T09:30:00.000Z');

		expect(isDraftOpenWindowOpen(startAt, openAtStartMinus90)).toBe(true);
		expect(isDraftOpenWindowOpen(startAt, openAtStartMinus30)).toBe(false);
	});

	it('allows edit and cancel until start minus 15 minutes', () => {
		const startAt = '2026-07-01T10:00:00.000Z';
		const atStartMinus30 = Date.parse('2026-07-01T09:30:00.000Z');
		const atStartMinus10 = Date.parse('2026-07-01T09:50:00.000Z');

		expect(isSessionMutable(startAt, atStartMinus30)).toBe(true);
		expect(isSessionMutable(startAt, atStartMinus10)).toBe(false);
	});
});
