import { describe, expect, it } from 'vitest';
import { computeCourtShare, computeSessionProfit } from '@repo/ui/payments';

describe('computeCourtShare', () => {
	it('returns the flat fixed fee regardless of player count', () => {
		expect(
			computeCourtShare({
				courtFeePerHour: 200,
				startAt: '2026-06-01T08:00:00.000Z',
				endAt: '2026-06-01T12:00:00.000Z',
				courtCount: 4,
				activePlayers: 10,
				fixedCourtFeePerPlayer: 150
			})
		).toBe(150);
	});

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

	it('matches in-progress join estimate: split across existing billable players plus joiner', () => {
		const existingBillablePlayers = 4;
		const share = computeCourtShare({
			courtFeePerHour: 200,
			startAt: '2026-06-01T08:00:00.000Z',
			endAt: '2026-06-01T12:00:00.000Z',
			courtCount: 2,
			activePlayers: existingBillablePlayers + 1
		});

		expect(share).toBe(320);
	});
});

describe('computeSessionProfit', () => {
	// Court cost: 200/hr × 4h × 2 courts = 1600.
	const base = {
		courtFeePerHour: 200,
		startAt: '2026-06-01T08:00:00.000Z',
		endAt: '2026-06-01T12:00:00.000Z',
		courtCount: 2,
		shuttlePricePerEach: 25,
		shuttleCostPerEach: 20
	};

	it('cost-sharing mode: zero court profit, shuttle markup is the only profit', () => {
		const profit = computeSessionProfit({
			...base,
			fixedCourtFeePerPlayer: null,
			billedPlayers: 8,
			shuttlesUsed: 10
		});

		expect(profit.courtCost).toBe(1600);
		expect(profit.courtRevenue).toBe(1600);
		expect(profit.courtProfit).toBe(0);
		expect(profit.shuttleProfit).toBe(50); // 10 × (25 − 20)
		expect(profit.totalProfit).toBe(50);
	});

	it('fixed-fee mode: court profit = fixed fee × billed players − real cost', () => {
		const profit = computeSessionProfit({
			...base,
			fixedCourtFeePerPlayer: 250,
			billedPlayers: 8, // revenue 2000, cost 1600 → 400 court profit
			shuttlesUsed: 10 // 50 shuttle profit
		});

		expect(profit.courtRevenue).toBe(2000);
		expect(profit.courtProfit).toBe(400);
		expect(profit.shuttleProfit).toBe(50);
		expect(profit.totalProfit).toBe(450);
	});

	it('fixed fee below cost yields a negative (loss) court profit', () => {
		const profit = computeSessionProfit({
			...base,
			fixedCourtFeePerPlayer: 100,
			billedPlayers: 8, // revenue 800, cost 1600 → −800
			shuttlesUsed: 0
		});

		expect(profit.courtProfit).toBe(-800);
		expect(profit.totalProfit).toBe(-800);
	});
});
