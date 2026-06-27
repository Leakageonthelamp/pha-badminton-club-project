import { describe, expect, it } from 'vitest';
import { bangkokLocalToUtc, formatBangkok, utcToBangkokLocalInput } from './bangkok';

describe('bangkok datetime helpers', () => {
	it('converts Bangkok local time to UTC', () => {
		expect(bangkokLocalToUtc('2026-06-27T19:00')).toBe('2026-06-27T12:00:00.000Z');
	});

	it('round-trips through local input formatting', () => {
		const utc = bangkokLocalToUtc('2026-06-27T19:00');
		expect(utcToBangkokLocalInput(utc)).toBe('2026-06-27T19:00');
	});

	it('formats Bangkok wall time for display', () => {
		expect(formatBangkok('2026-06-27T12:00:00.000Z')).toContain('19:00');
	});
});
