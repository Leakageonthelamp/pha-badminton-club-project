import { describe, expect, it } from 'vitest';
import {
	DISPLAY_NAME_CHARS_ERROR,
	DISPLAY_NAME_MAX,
	DISPLAY_NAME_SPACE_ERROR,
	validateDisplayName
} from '$lib/validation/displayName';

describe('validateDisplayName', () => {
	it('accepts names within the length limit', () => {
		expect(validateDisplayName('Jo')).toBeNull();
		expect(validateDisplayName('Player_01')).toBeNull();
		expect(validateDisplayName('สมชาย')).toBeNull();
		expect(validateDisplayName('a'.repeat(DISPLAY_NAME_MAX))).toBeNull();
	});

	it('rejects names over 50 characters', () => {
		expect(validateDisplayName('a'.repeat(DISPLAY_NAME_MAX + 1))).toBe(
			'Display name must not exceed 50 characters'
		);
	});

	it('rejects names under 2 characters', () => {
		expect(validateDisplayName('J')).toBe('Display name must be at least 2 characters');
	});

	it('rejects names with spaces', () => {
		expect(validateDisplayName('John Doe')).toBe(DISPLAY_NAME_SPACE_ERROR);
		expect(validateDisplayName('John')).toBeNull();
	});

	it('rejects unsafe special characters', () => {
		expect(validateDisplayName('John@Doe')).toBe(DISPLAY_NAME_CHARS_ERROR);
		expect(validateDisplayName('<script>')).toBe(DISPLAY_NAME_CHARS_ERROR);
		expect(validateDisplayName('player.name')).toBe(DISPLAY_NAME_CHARS_ERROR);
	});
});
