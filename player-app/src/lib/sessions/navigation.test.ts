import { describe, expect, it } from 'vitest';
import {
	findLiveSession,
	isInUnresolvedMatch,
	liveSessionHref,
	matchLiveHref,
	shouldOpenHistorySessionSummary,
	shouldOpenLiveSession,
	shouldOpenMatchLive,
	shouldViewSessionLivePage
} from './navigation';
import type { SessionListItem } from '$lib/types/session';

const session = (
	overrides: Partial<SessionListItem>
): SessionListItem =>
	({
		id: 's1',
		status: 'open',
		my_membership: null,
		...overrides
	}) as SessionListItem;

describe('shouldOpenLiveSession', () => {
	it('returns true for joined in_progress sessions', () => {
		expect(
			shouldOpenLiveSession(
				session({
					status: 'in_progress',
					my_membership: {
						id: 'm1',
						status: 'confirmed',
						fee_owed: 0,
						fee_status: 'none',
						joined_at: '2026-06-01T00:00:00.000Z',
						activity: 'idle',
						idle_since: '2026-06-01T00:00:00.000Z'
					}
				})
			)
		).toBe(true);
	});

	it('returns false for open sessions or non-members', () => {
		expect(shouldOpenLiveSession(session({ status: 'open' }))).toBe(false);
		expect(
			shouldOpenLiveSession(
				session({
					status: 'in_progress',
					my_membership: null
				})
			)
		).toBe(false);
	});

	it('returns false for waiting or queued memberships', () => {
		expect(
			shouldOpenLiveSession(
				session({
					status: 'in_progress',
					my_membership: {
						id: 'm1',
						status: 'waiting',
						fee_owed: 0,
						fee_status: 'none',
						joined_at: '2026-06-01T00:00:00.000Z',
						activity: 'idle',
						idle_since: null
					}
				})
			)
		).toBe(false);
		expect(
			shouldOpenLiveSession(
				session({
					status: 'in_progress',
					my_membership: {
						id: 'm1',
						status: 'queued',
						fee_owed: 0,
						fee_status: 'none',
						joined_at: '2026-06-01T00:00:00.000Z',
						activity: 'idle',
						idle_since: null
					}
				})
			)
		).toBe(false);
	});
});

describe('shouldOpenHistorySessionSummary', () => {
	it('returns true for closed sessions the player completed', () => {
		expect(
			shouldOpenHistorySessionSummary({
				status: 'closed',
				membership_status: 'confirmed'
			})
		).toBe(true);
		expect(
			shouldOpenHistorySessionSummary({
				status: 'closed',
				membership_status: 'left'
			})
		).toBe(true);
	});

	it('returns false for cancelled or incomplete sessions', () => {
		expect(
			shouldOpenHistorySessionSummary({
				status: 'cancelled',
				membership_status: 'confirmed'
			})
		).toBe(false);
		expect(
			shouldOpenHistorySessionSummary({
				status: 'closed',
				membership_status: 'cancelled'
			})
		).toBe(false);
	});
});

describe('shouldViewSessionLivePage', () => {
	const membership = {
		id: 'm1',
		status: 'confirmed' as const,
		fee_owed: 0,
		fee_status: 'none' as const,
		joined_at: '2026-06-01T00:00:00.000Z',
		activity: 'idle' as const,
		idle_since: '2026-06-01T00:00:00.000Z'
	};

	it('allows closed sessions with confirmed membership', () => {
		expect(
			shouldViewSessionLivePage(
				session({
					status: 'closed',
					my_membership: membership
				})
			)
		).toBe(true);
	});

	it('allows left players on in-progress sessions', () => {
		expect(
			shouldViewSessionLivePage(
				session({
					status: 'in_progress',
					my_membership: { ...membership, status: 'left' }
				})
			)
		).toBe(true);
	});
});

describe('liveSessionHref', () => {
	it('builds the live session route', () => {
		expect(liveSessionHref('abc-123')).toBe('/sessions/abc-123/live');
	});
});

describe('matchLiveHref', () => {
	it('builds the match live route', () => {
		expect(matchLiveHref('abc-123', 'match-1')).toBe('/sessions/abc-123/live/match/match-1');
	});
});

describe('shouldOpenMatchLive', () => {
	it('returns true only for active matches', () => {
		expect(shouldOpenMatchLive({ status: 'active' })).toBe(true);
		expect(shouldOpenMatchLive({ status: 'score_pending' })).toBe(false);
		expect(shouldOpenMatchLive(null)).toBe(false);
	});
});

describe('isInUnresolvedMatch', () => {
	it('returns true for pending through suspended matches', () => {
		expect(isInUnresolvedMatch({ status: 'pending' })).toBe(true);
		expect(isInUnresolvedMatch({ status: 'active' })).toBe(true);
		expect(isInUnresolvedMatch({ status: 'score_pending' })).toBe(true);
		expect(isInUnresolvedMatch({ status: 'completed' })).toBe(false);
	});
});

describe('findLiveSession', () => {
	it('returns the in-progress session the player has joined', () => {
		const sessions = [
			session({
				id: 'open',
				my_membership: {
					id: 'm1',
					status: 'confirmed',
					fee_owed: 0,
					fee_status: 'none',
					joined_at: '2026-06-01T00:00:00.000Z',
					activity: 'idle',
					idle_since: '2026-06-01T00:00:00.000Z'
				}
			}),
			session({
				id: 'live',
				status: 'in_progress',
				name: 'Friday night',
				my_membership: {
					id: 'm2',
					status: 'confirmed',
					fee_owed: 0,
					fee_status: 'none',
					joined_at: '2026-06-01T00:00:00.000Z',
					activity: 'idle',
					idle_since: '2026-06-01T00:00:00.000Z'
				}
			})
		];

		expect(findLiveSession(sessions)?.id).toBe('live');
	});

	it('returns null when no live session exists', () => {
		expect(findLiveSession([session({ status: 'open' })])).toBeNull();
	});
});
