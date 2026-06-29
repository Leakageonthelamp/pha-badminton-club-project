import { describe, expect, it } from 'vitest';
import { computePlayerShuttleShare, deriveShuttlesFromShare } from './payments.js';

describe('computePlayerShuttleShare', () => {
	it('returns 0 when no shuttles used', () => {
		expect(computePlayerShuttleShare(0, 100)).toBe(0);
	});

	it('returns 0 when price is zero', () => {
		expect(computePlayerShuttleShare(5, 0)).toBe(0);
	});

	it('splits shuttles four ways and rounds to 2 decimals', () => {
		expect(computePlayerShuttleShare(3, 60)).toBe(45);
		expect(computePlayerShuttleShare(5, 100)).toBe(125);
	});
});

describe('deriveShuttlesFromShare', () => {
	it('inverts computePlayerShuttleShare', () => {
		expect(deriveShuttlesFromShare(45, 60)).toBe(3);
		expect(deriveShuttlesFromShare(125, 100)).toBe(5);
	});

	it('returns 0 when share or price is zero', () => {
		expect(deriveShuttlesFromShare(0, 60)).toBe(0);
		expect(deriveShuttlesFromShare(45, 0)).toBe(0);
	});
});
