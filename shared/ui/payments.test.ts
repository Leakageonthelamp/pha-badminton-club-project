import { describe, expect, it } from 'vitest';
import { computeCourtShare, computeCourtTotal } from './payments.js';

describe('payments helpers', () => {
	const sessionWindow = {
		courtFeePerHour: 200,
		startAt: '2026-06-29T12:00:00.000Z',
		endAt: '2026-06-29T15:00:00.000Z',
		courtCount: 2
	};

	it('computeCourtTotal multiplies hourly rate, duration, and courts', () => {
		expect(computeCourtTotal(sessionWindow)).toBe(1200);
	});

	it('computeCourtShare splits total across active players', () => {
		const total = computeCourtTotal(sessionWindow);
		expect(computeCourtShare({ ...sessionWindow, activePlayers: 4 })).toBe(300);
		expect(computeCourtShare({ ...sessionWindow, activePlayers: 4 }) * 4).toBe(total);
	});

	it('computeCourtShare returns 0 when no active players', () => {
		expect(computeCourtShare({ ...sessionWindow, activePlayers: 0 })).toBe(0);
	});
});
