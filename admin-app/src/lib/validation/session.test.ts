import { describe, expect, it, vi, afterEach } from 'vitest';
import { buildSessionInputSchema, sessionInputSchema } from './session';

const validSessionInput = {
	club_id: '22222222-2222-4222-8222-222222222222',
	name: 'Friday Night',
	description: '',
	start_at: '2026-06-01T12:00:00.000Z',
	end_at: '2026-06-01T13:00:00.000Z',
	venue_name: 'Court A',
	latitude: 13.7,
	longitude: 100.5,
	max_players: 12,
	min_players: 4,
	court_count: 2,
	court_fee_per_hour: 200,
	shuttle_id: '11111111-1111-4111-8111-111111111111',
	shuttle_price_per_each: 80,
	match_score_type: 21,
	match_type: 'one_round' as const,
	cancellation_fee: 0,
	max_buffer: 0
};

describe('sessionInputSchema start lead time', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('rejects a start 1 hour ahead', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-01T10:00:00.000Z'));

		const result = sessionInputSchema.safeParse({
			...validSessionInput,
			start_at: '2026-06-01T11:00:00.000Z',
			end_at: '2026-06-01T12:00:00.000Z'
		});

		expect(result.success).toBe(false);
	});

	it('accepts a start 2 hours ahead', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-01T10:00:00.000Z'));

		const result = sessionInputSchema.safeParse(validSessionInput);

		expect(result.success).toBe(true);
	});
});

describe('buildSessionInputSchema for edits', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('accepts a start 30 minutes ahead without the 90-minute create lead', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-01T10:00:00.000Z'));

		const result = buildSessionInputSchema(0).safeParse({
			...validSessionInput,
			start_at: '2026-06-01T10:30:00.000Z',
			end_at: '2026-06-01T11:30:00.000Z'
		});

		expect(result.success).toBe(true);
	});

	it('rejects a past start', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-01T13:00:00.000Z'));

		const result = buildSessionInputSchema(0).safeParse(validSessionInput);

		expect(result.success).toBe(false);
	});
});
