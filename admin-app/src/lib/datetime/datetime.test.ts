import { describe, expect, it } from 'vitest';
import {
	addHoursToLocalInput,
	dateToLocalInput,
	formatDateTime,
	formatUptime,
	localInputToDate,
	localInputToUtc,
	localInputToUtcSafe,
	utcToLocalInput
} from '@repo/ui/datetime';

// These assertions are timezone-independent so they pass regardless of the
// runtime TZ (CI, local machine, etc.).
describe('device-timezone datetime helpers', () => {
	it('converts a datetime-local value to a UTC ISO string (Z-suffixed)', () => {
		const utc = localInputToUtc('2026-06-27T19:00');
		expect(utc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
	});

	it('round-trips local input -> UTC -> local input', () => {
		const local = '2026-06-27T19:00';
		expect(utcToLocalInput(localInputToUtc(local))).toBe(local);
	});

	it('round-trips local input -> Date -> local input', () => {
		const local = '2026-06-27T19:00';
		const date = localInputToDate(local);
		expect(date).not.toBeNull();
		expect(dateToLocalInput(date!)).toBe(local);
	});

	it('adds hours to a local datetime value', () => {
		expect(addHoursToLocalInput('2026-06-27T19:00', 1)).toBe('2026-06-27T20:00');
		expect(addHoursToLocalInput('2026-06-27T23:30', 2)).toBe('2026-06-28T01:30');
	});

	it('throws on empty input but localInputToUtcSafe returns empty string', () => {
		expect(() => localInputToUtc('')).toThrow();
		expect(localInputToUtcSafe('')).toBe('');
		expect(localInputToUtcSafe('not-a-date')).toBe('');
	});

	it('formats a UTC timestamp without throwing', () => {
		expect(formatDateTime('2026-06-27T12:00:00.000Z')).toBeTruthy();
	});

	it('formats uptime as HH:mm:ss', () => {
		const start = '2026-06-27T12:00:00.000Z';
		const now = Date.parse('2026-06-27T14:30:45.000Z');
		expect(formatUptime(start, now)).toBe('02:30:45');
		expect(formatUptime(start, Date.parse(start))).toBe('00:00:00');
		expect(formatUptime(start, Date.parse(start) - 1)).toBe('00:00:00');
	});
});
