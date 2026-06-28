import { describe, expect, it } from 'vitest';
import {
	buildSessionHistorySummary,
	computeTotalShuttleUsage,
	formatSessionDuration,
	formatSessionUptime,
	isAttendedPlayer
} from './sessionHistory';
import { isOutstandingCancellationFee } from '@repo/ui/payments';
import type { SessionPaymentWithProfile } from '$lib/types/payment';
import type { SessionPlayerWithProfile } from '$lib/types/session';

const basePlayer = (overrides: Partial<SessionPlayerWithProfile>): SessionPlayerWithProfile => ({
	id: 'p1',
	session_id: 's1',
	user_id: 'u1',
	status: 'confirmed',
	fee_owed: 0,
	fee_status: 'none',
	fee_paid_at: null,
	joined_at: '2026-06-28T10:00:00.000Z',
	decided_at: null,
	left_at: null,
	activity: 'idle',
	idle_since: '2026-06-28T10:00:00.000Z',
	created_at: '2026-06-28T10:00:00.000Z',
	updated_at: '2026-06-28T10:00:00.000Z',
	profile: { id: 'u1', display_name: 'Player One', tag: '#abc', avatar_url: null },
	...overrides
});

const basePayment = (overrides: Partial<SessionPaymentWithProfile>): SessionPaymentWithProfile => ({
	id: 'pay1',
	session_id: 's1',
	user_id: 'u1',
	court_share: 100,
	shuttle_share: 0,
	total_amount: 100,
	status: 'approved',
	decided_by: null,
	decided_at: null,
	created_at: '2026-06-28T14:00:00.000Z',
	updated_at: '2026-06-28T14:00:00.000Z',
	profile: { id: 'u1', display_name: 'Player One', tag: '#abc', avatar_url: null },
	...overrides
});

const baseSession = {
	start_at: '2026-06-28T10:00:00.000Z',
	end_at: '2026-06-28T14:00:00.000Z',
	status: 'closed' as const,
	finished_at: '2026-06-28T22:05:00.000Z',
	updated_at: '2026-06-28T22:05:00.000Z',
	court_fee_per_hour: 200,
	court_count: 2,
	shuttle_price_per_each: 25,
	max_players: 12
};

describe('sessionHistory helpers', () => {
	it('formats session duration', () => {
		expect(formatSessionDuration('2026-06-28T10:00:00.000Z', '2026-06-28T14:00:00.000Z')).toBe(
			'4 hr'
		);
	});

	it('counts attended players as confirmed or left', () => {
		expect(isAttendedPlayer('confirmed')).toBe(true);
		expect(isAttendedPlayer('left')).toBe(true);
		expect(isAttendedPlayer('waiting')).toBe(false);
	});

	it('summarizes roster, payments, and court share', () => {
		const summary = buildSessionHistorySummary(
			baseSession,
			[
				basePlayer({ id: 'p1', user_id: 'u1', status: 'left' }),
				basePlayer({ id: 'p2', user_id: 'u2', status: 'confirmed' }),
				basePlayer({ id: 'p3', user_id: 'u3', status: 'cancelled' })
			],
			[
				basePayment({ user_id: 'u1', total_amount: 150, status: 'approved' }),
				basePayment({ user_id: 'u2', total_amount: 150, status: 'submitted' })
			]
		);

		expect(summary.durationLabel).toBe('4 hr');
		expect(summary.uptimeLabel).toBe('12 hr 5 min');
		expect(summary.attendedCount).toBe(2);
		expect(summary.rosterCount).toBe(3);
		expect(summary.perPlayerCourtShare).toBe(800);
		expect(summary.paymentsApprovedCount).toBe(1);
		expect(summary.paymentsSubmittedCount).toBe(1);
		expect(summary.totalCollected).toBe(150);
		expect(summary.totalBilled).toBe(300);
		expect(summary.matchCount).toBe(0);
		expect(summary.totalShuttleUsage).toBe(0);
	});

	it('derives shuttle usage from billed shuttle shares', () => {
		expect(
			computeTotalShuttleUsage(
				[
					{ shuttle_share: 12.5 },
					{ shuttle_share: 12.5 },
					{ shuttle_share: 12.5 },
					{ shuttle_share: 12.5 }
				],
				25
			)
		).toBe(2);

		const summary = buildSessionHistorySummary(
			baseSession,
			[basePlayer({ id: 'p1', user_id: 'u1' })],
			[basePayment({ shuttle_share: 50, total_amount: 850 })],
			3
		);

		expect(summary.matchCount).toBe(3);
		expect(summary.totalShuttleUsage).toBe(2);
	});

	it('falls back to updated_at for legacy closed sessions without finished_at', () => {
		expect(
			formatSessionUptime('2026-06-28T18:00:00.000Z', {
				status: 'closed',
				finished_at: null,
				updated_at: '2026-06-28T23:00:00.000Z'
			})
		).toBe('5 hr');
	});

	it('tracks cancellation fees separately from court payments', () => {
		expect(isOutstandingCancellationFee(100, 'paid')).toBe(false);
		expect(isOutstandingCancellationFee(100, 'waived')).toBe(false);
		expect(isOutstandingCancellationFee(100, 'owed')).toBe(true);
		expect(isOutstandingCancellationFee(100, 'submitted')).toBe(true);

		const summary = buildSessionHistorySummary(
			baseSession,
			[
				basePlayer({ id: 'p1', user_id: 'u1', status: 'cancelled', fee_owed: 200, fee_status: 'paid' }),
				basePlayer({ id: 'p2', user_id: 'u2', status: 'cancelled', fee_owed: 150, fee_status: 'owed' })
			],
			[basePayment({ user_id: 'u1', total_amount: 150, status: 'approved' })]
		);

		expect(summary.cancellationFeesCollected).toBe(200);
		expect(summary.cancellationFeesOutstandingCount).toBe(1);
		expect(summary.cancellationFeesPaidCount).toBe(1);
		expect(summary.totalCollected).toBe(150);
	});
});
