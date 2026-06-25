import { describe, expect, it } from 'vitest';
import { parseRegisterInput } from '$lib/server/auth';

const validInput = {
	displayName: 'Player01',
	identifier: 'player@example.com',
	password: 'Password123!',
	confirmPassword: 'Password123!'
};

describe('parseRegisterInput', () => {
	it('rejects mismatched passwords', () => {
		const result = parseRegisterInput({
			...validInput,
			confirmPassword: 'Password456!'
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.flatten().fieldErrors.confirmPassword).toEqual(['Passwords do not match']);
		}
	});

	it('accepts matching passwords that meet register rules', () => {
		const result = parseRegisterInput(validInput);

		expect(result.success).toBe(true);
	});

	it('rejects weak passwords', () => {
		const result = parseRegisterInput({
			...validInput,
			password: 'password123',
			confirmPassword: 'password123'
		});

		expect(result.success).toBe(false);
	});
});
