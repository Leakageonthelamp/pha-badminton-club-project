import { describe, expect, it } from 'vitest';
import {
	PASSWORD_MIN_LENGTH_ERROR,
	PASSWORD_SPECIAL_ERROR,
	PASSWORD_UPPERCASE_ERROR,
	validateRegisterPassword
} from '$lib/validation/password';

describe('validateRegisterPassword', () => {
	it('accepts passwords that meet all rules', () => {
		expect(validateRegisterPassword('Password123!')).toBeNull();
	});

	it('rejects passwords under 10 characters', () => {
		expect(validateRegisterPassword('Pass1!')).toBe(PASSWORD_MIN_LENGTH_ERROR);
	});

	it('rejects passwords without uppercase', () => {
		expect(validateRegisterPassword('password123!')).toBe(PASSWORD_UPPERCASE_ERROR);
	});

	it('rejects passwords without special characters', () => {
		expect(validateRegisterPassword('Password1234')).toBe(PASSWORD_SPECIAL_ERROR);
	});
});
