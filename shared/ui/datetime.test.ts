import { describe, expect, it } from 'vitest';
import { formatSessionDuration } from './datetime';

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
