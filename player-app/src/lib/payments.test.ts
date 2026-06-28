import { describe, expect, it } from 'vitest';
import { computeCourtShare } from '@repo/ui/payments';

describe('computeCourtShare', () => {
	it('splits full session court cost evenly across active players', () => {
		const share = computeCourtShare({
			courtFeePerHour: 200,
			startAt: '2026-06-01T08:00:00.000Z',
			endAt: '2026-06-01T12:00:00.000Z',
			courtCount: 4,
			activePlayers: 10
		});

		expect(share).toBe(320);
	});

	it('returns 0 when there are no active players', () => {
		expect(
			computeCourtShare({
				courtFeePerHour: 200,
				startAt: '2026-06-01T08:00:00.000Z',
				endAt: '2026-06-01T12:00:00.000Z',
				courtCount: 4,
				activePlayers: 0
			})
		).toBe(0);
	});
});
