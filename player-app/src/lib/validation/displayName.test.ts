import { t } from '@repo/ui/i18n';
import { describe, expect, it } from 'vitest';
import {
	DISPLAY_NAME_MAX,
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
			t('validation.displayName.max', { max: DISPLAY_NAME_MAX })
		);
	});

	it('rejects names under 2 characters', () => {
		expect(validateDisplayName('J')).toBe(t('validation.displayName.min', { min: 2 }));
	});

	it('rejects names with spaces', () => {
		expect(validateDisplayName('John Doe')).toBe(t('validation.displayName.noSpaces'));
		expect(validateDisplayName('John')).toBeNull();
	});

	it('rejects unsafe special characters', () => {
		expect(validateDisplayName('John@Doe')).toBe(t('validation.displayName.invalidChars'));
		expect(validateDisplayName('<script>')).toBe(t('validation.displayName.invalidChars'));
		expect(validateDisplayName('player.name')).toBe(t('validation.displayName.invalidChars'));
	});
});
