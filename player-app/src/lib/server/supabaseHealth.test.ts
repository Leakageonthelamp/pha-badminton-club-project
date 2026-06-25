import { describe, expect, it } from 'vitest';
import { isSupabaseUnavailableError } from './supabaseHealth';

describe('isSupabaseUnavailableError', () => {
	it('detects fetch TypeErrors', () => {
		expect(isSupabaseUnavailableError(new TypeError('fetch failed'))).toBe(true);
	});

	it('detects HTTP 503', () => {
		expect(isSupabaseUnavailableError({ status: 503, message: 'Service Unavailable' })).toBe(true);
	});

	it('ignores validation errors', () => {
		expect(isSupabaseUnavailableError({ message: 'Invalid login credentials' })).toBe(false);
	});
});
