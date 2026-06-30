import { describe, expect, it } from 'vitest';
import { formatDurationMs, formatSessionDuration } from './datetime';

describe('formatSessionDuration', () => {
	it('formats whole hours', () => {
		expect(formatSessionDuration('2026-06-28T10:00:00.000Z', '2026-06-28T14:00:00.000Z')).toBe(
			'4 hr'
		);
	});

	it('formats hours and minutes', () => {
		expect(formatSessionDuration('2026-06-28T10:00:00.000Z', '2026-06-28T12:30:00.000Z')).toBe(
			'2 hr 30 min'
		);
	});

	it('formats minutes only', () => {
		expect(formatSessionDuration('2026-06-28T10:00:00.000Z', '2026-06-28T10:45:00.000Z')).toBe(
			'45 min'
		);
	});
});

describe('formatDurationMs', () => {
	it('formats elapsed milliseconds as HH:mm:ss', () => {
		expect(formatDurationMs(90_000)).toBe('00:01:30');
		expect(formatDurationMs(3_661_000)).toBe('01:01:01');
	});

	it('returns zero duration for non-positive values', () => {
		expect(formatDurationMs(0)).toBe('00:00:00');
		expect(formatDurationMs(-1)).toBe('00:00:00');
	});
});
