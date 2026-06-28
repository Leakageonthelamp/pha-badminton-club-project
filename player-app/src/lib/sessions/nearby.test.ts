import { describe, expect, it } from 'vitest';
import { featuredSessions, myJoinedSessions, sessionsWithDistance, FEATURED_SESSIONS_LIMIT } from './nearby';
import type { SessionListItem } from '$lib/types/session';

const sessions: SessionListItem[] = [
	{
		id: 'a',
		club_id: 'c1',
		name: 'Alpha Session',
		description: '',
		status: 'open',
		start_at: '2026-07-01T14:00:00.000Z',
		end_at: '2026-07-01T16:00:00.000Z',
		venue_name: 'Venue A',
		latitude: 13.7563,
		longitude: 100.5018,
		max_players: 12,
		min_players: 4,
		court_count: 2,
		court_fee_per_hour: 200,
		shuttle_price_per_each: 5,
		match_score_type: 21,
		match_type: 'one_round',
		cancellation_fee: 0,
		max_buffer: 2,
		promptpay_type: 'phone',
		promptpay_target: '0812345678',
		club: { id: 'c1', name: 'Club A' },
		waiting_count: 0,
		queued_count: 0,
		my_membership: null
	},
	{
		id: 'b',
		club_id: 'c2',
		name: 'Bravo Session',
		description: '',
		status: 'open',
		start_at: '2026-07-01T10:00:00.000Z',
		end_at: '2026-07-01T12:00:00.000Z',
		venue_name: 'Venue B',
		latitude: 13.73,
		longitude: 100.52,
		max_players: 12,
		min_players: 4,
		court_count: 2,
		court_fee_per_hour: 200,
		shuttle_price_per_each: 5,
		match_score_type: 21,
		match_type: 'one_round',
		cancellation_fee: 0,
		max_buffer: 2,
		promptpay_type: 'phone',
		promptpay_target: '0812345678',
		club: { id: 'c2', name: 'Club B' },
		waiting_count: 0,
		queued_count: 0,
		my_membership: null
	},
	{
		id: 'c',
		club_id: 'c3',
		name: 'Charlie Session',
		description: '',
		status: 'open',
		start_at: '2026-07-01T08:00:00.000Z',
		end_at: '2026-07-01T10:00:00.000Z',
		venue_name: null,
		latitude: null,
		longitude: null,
		max_players: 12,
		min_players: 4,
		court_count: 2,
		court_fee_per_hour: 200,
		shuttle_price_per_each: 5,
		match_score_type: 21,
		match_type: 'one_round',
		cancellation_fee: 0,
		max_buffer: 0,
		promptpay_type: null,
		promptpay_target: null,
		club: { id: 'c3', name: 'Club C' },
		waiting_count: 0,
		queued_count: 0,
		my_membership: null
	}
];

describe('sessionsWithDistance', () => {
	it('sorts by start time when user location is unavailable', () => {
		const sorted = sessionsWithDistance(sessions, null);
		expect(sorted.map((session) => session.id)).toEqual(['c', 'b', 'a']);
		expect(sorted.every((session) => session.distanceKm === null)).toBe(true);
	});

	it('sorts nearest first then soonest start when distances tie-break', () => {
		const sorted = sessionsWithDistance(sessions, {
			latitude: 13.7563,
			longitude: 100.5018,
			at: Date.now()
		});

		expect(sorted[0]?.id).toBe('a');
		expect(sorted[0]?.distanceKm).toBe(0);
		expect(sorted[1]?.id).toBe('b');
		expect(sorted[1]?.distanceKm).toBeGreaterThan(0);
		expect(sorted[2]?.id).toBe('c');
		expect(sorted[2]?.distanceKm).toBeNull();
	});
});

describe('featuredSessions', () => {
	it('returns top open joinable sessions sorted by soonest start', () => {
		const featured = featuredSessions(sessions, null, 2);
		expect(featured.map((s) => s.id)).toEqual(['c', 'b']);
	});

	it('caps at FEATURED_SESSIONS_LIMIT by default', () => {
		const many = Array.from({ length: 8 }, (_, index) => ({
			...sessions[0]!,
			id: `s${index}`,
			start_at: `2026-07-0${index + 1}T10:00:00.000Z`
		}));
		expect(featuredSessions(many, null)).toHaveLength(FEATURED_SESSIONS_LIMIT);
	});

	it('excludes in-progress and already-joined sessions', () => {
		const pool = [
			{ ...sessions[0]!, id: 'live', status: 'in_progress' as const },
			{
				...sessions[1]!,
				id: 'joined',
				my_membership: {
					id: 'm1',
					status: 'confirmed' as const,
					fee_owed: 0,
					fee_status: 'none' as const,
					joined_at: '2026-06-01T00:00:00.000Z',
					activity: 'idle' as const,
					idle_since: '2026-06-01T00:00:00.000Z'
				}
			},
			sessions[2]!
		];

		expect(featuredSessions(pool, null).map((session) => session.id)).toEqual(['c']);
	});

	it('prefers nearest open sessions when location is available', () => {
		const featured = featuredSessions(sessions, {
			latitude: 13.7563,
			longitude: 100.5018,
			at: Date.now()
		});

		expect(featured.map((session) => session.id)).toEqual(['a', 'b', 'c']);
	});
});

describe('myJoinedSessions', () => {
	it('returns only sessions with an active membership', () => {
		const joined = myJoinedSessions(
			[
				{ ...sessions[0]!, my_membership: { id: 'm1', status: 'waiting', fee_owed: 0, fee_status: 'none', joined_at: '2026-06-01T00:00:00.000Z', activity: 'idle', idle_since: '2026-06-01T00:00:00.000Z' } },
				sessions[1]!,
				{ ...sessions[2]!, my_membership: { id: 'm2', status: 'confirmed', fee_owed: 0, fee_status: 'none', joined_at: '2026-06-01T00:00:00.000Z', activity: 'idle', idle_since: '2026-06-01T00:00:00.000Z' } }
			],
			null
		);

		expect(joined.map((session) => session.id)).toEqual(['c', 'a']);
		expect(joined).toHaveLength(2);
	});
});
