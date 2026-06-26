import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockMaybeSingle = vi.fn();
const mockGetUserById = vi.fn();

const mockFrom = vi.fn(() => ({
	select: vi.fn(() => ({
		eq: vi.fn(() => ({
			maybeSingle: mockMaybeSingle
		}))
	}))
}));

vi.mock('$lib/supabase/server', () => ({
	createSupabaseAdminClient: () => ({
		from: mockFrom,
		auth: {
			admin: {
				getUserById: mockGetUserById
			}
		}
	})
}));

import { parseRegisterInput, resolveLoginEmail } from './auth';

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
			expect(result.error.flatten().fieldErrors.confirmPassword).toEqual([
				'Passwords do not match'
			]);
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

describe('resolveLoginEmail', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns auth email when profile email matches a phone-primary user', async () => {
		mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'user-1' } });
		mockGetUserById.mockResolvedValueOnce({
			data: { user: { email: '66812345678@phone.ph-badminton.local' } },
			error: null
		});

		const result = await resolveLoginEmail('player@example.com');

		expect(result).toBe('66812345678@phone.ph-badminton.local');
		expect(mockFrom).toHaveBeenCalledWith('profiles');
	});

	it('returns the identifier when no profile matches the email', async () => {
		mockMaybeSingle.mockResolvedValueOnce({ data: null });

		const result = await resolveLoginEmail('solo@example.com');

		expect(result).toBe('solo@example.com');
		expect(mockGetUserById).not.toHaveBeenCalled();
	});

	it('resolves phone identifiers through the profile lookup', async () => {
		mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'user-2' } });
		mockGetUserById.mockResolvedValueOnce({
			data: { user: { email: '66898765432@phone.ph-badminton.local' } },
			error: null
		});

		const result = await resolveLoginEmail('0898765432');

		expect(result).toBe('66898765432@phone.ph-badminton.local');
	});
});
