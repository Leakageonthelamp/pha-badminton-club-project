import { describe, expect, it } from 'vitest';
import { paginate, PAGE_SIZE } from './pagination.js';

describe('paginate', () => {
	it('returns first page slice', () => {
		const items = Array.from({ length: 12 }, (_, index) => index);
		const result = paginate(items, 1);

		expect(result.items).toHaveLength(PAGE_SIZE);
		expect(result.page).toBe(1);
		expect(result.totalPages).toBe(2);
		expect(result.totalCount).toBe(12);
		expect(result.hasPrev).toBe(false);
		expect(result.hasNext).toBe(true);
	});

	it('returns second page slice', () => {
		const items = Array.from({ length: 12 }, (_, index) => index);
		const result = paginate(items, 2);

		expect(result.items).toHaveLength(2);
		expect(result.items[0]).toBe(10);
		expect(result.hasPrev).toBe(true);
		expect(result.hasNext).toBe(false);
	});

	it('clamps page to valid range', () => {
		const items = [1, 2, 3];
		expect(paginate(items, 0).page).toBe(1);
		expect(paginate(items, 99).page).toBe(1);
	});

	it('handles empty list', () => {
		const result = paginate([], 1);

		expect(result.items).toEqual([]);
		expect(result.totalPages).toBe(1);
		expect(result.hasPrev).toBe(false);
		expect(result.hasNext).toBe(false);
	});
});
