import { describe, expect, it } from 'vitest';
import {
	clampTimeToMinDate,
	isHourAllowed,
	isMinuteAllowed,
	isSameLocalDay
} from './flatpickrTimeSelects';

describe('flatpickr time min constraints', () => {
	const minDate = new Date(2026, 5, 30, 14, 31);
	const sameDay = new Date(2026, 5, 30, 9, 0);
	const laterDay = new Date(2026, 6, 1, 9, 0);

	it('detects same local calendar day', () => {
		expect(isSameLocalDay(sameDay, minDate)).toBe(true);
		expect(isSameLocalDay(laterDay, minDate)).toBe(false);
	});

	it('blocks earlier hours on the min day only', () => {
		expect(isHourAllowed(13, sameDay, minDate)).toBe(false);
		expect(isHourAllowed(14, sameDay, minDate)).toBe(true);
		expect(isHourAllowed(9, laterDay, minDate)).toBe(true);
	});

	it('blocks earlier minutes when hour matches the min hour', () => {
		expect(isMinuteAllowed(30, sameDay, 14, minDate)).toBe(false);
		expect(isMinuteAllowed(31, sameDay, 14, minDate)).toBe(true);
		expect(isMinuteAllowed(0, sameDay, 15, minDate)).toBe(true);
	});

	it('disables the min minute when minDate has passed within that minute', () => {
		const minWithSeconds = new Date(2026, 5, 30, 14, 46, 30);
		expect(isMinuteAllowed(46, sameDay, 14, minWithSeconds)).toBe(false);
		expect(isMinuteAllowed(47, sameDay, 14, minWithSeconds)).toBe(true);
	});

	it('clamps a too-early datetime up to minDate', () => {
		const clamped = clampTimeToMinDate(new Date(2026, 5, 30, 10, 0), minDate);
		expect(clamped.getHours()).toBe(14);
		expect(clamped.getMinutes()).toBe(31);
	});

	it('clamps to the next minute when the min minute has already started', () => {
		const minWithSeconds = new Date(2026, 5, 30, 14, 46, 30);
		const clamped = clampTimeToMinDate(new Date(2026, 5, 30, 14, 46), minWithSeconds);
		expect(clamped.getHours()).toBe(14);
		expect(clamped.getMinutes()).toBe(47);
	});
});
