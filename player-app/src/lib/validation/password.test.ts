import { t } from '@repo/ui/i18n';
import { describe, expect, it } from 'vitest';
import {
	PASSWORD_MIN_LENGTH,
	validateRegisterPassword
} from '$lib/validation/password';

describe('validateRegisterPassword', () => {
	it('accepts a valid password', () => {
		expect(validateRegisterPassword('Password123!')).toBeNull();
	});

	it('rejects short passwords', () => {
		expect(validateRegisterPassword('Pass1!')).toBe(
			t('validation.password.minLength', { min: PASSWORD_MIN_LENGTH })
		);
	});

	it('requires an uppercase letter', () => {
		expect(validateRegisterPassword('password123!')).toBe(t('validation.password.uppercase'));
	});

	it('requires a special character', () => {
		expect(validateRegisterPassword('Password1234')).toBe(t('validation.password.special'));
	});
});
