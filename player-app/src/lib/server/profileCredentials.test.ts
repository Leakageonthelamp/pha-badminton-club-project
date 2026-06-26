import { describe, expect, it } from 'vitest';
import {
	oauthSignInMethodFromUser,
	parseCredentialsInput
} from './profileCredentials';
import { formatSignInMethodLabel, isOAuthSignInMethod } from '$lib/types/auth';
import type { User } from '@supabase/supabase-js';

describe('parseCredentialsInput', () => {
	it('requires current password for password account updates', () => {
		const result = parseCredentialsInput({
			email: 'player@example.com',
			phone: '',
			signInPreference: 'email',
			currentPassword: ''
		});

		expect(result.success).toBe(true);
	});
});

describe('oauthSignInMethodFromUser', () => {
	it('reads google from app metadata', () => {
		const user = {
			app_metadata: { provider: 'google' },
			identities: []
		} as unknown as User;

		expect(oauthSignInMethodFromUser(user)).toBe('google');
	});

	it('falls back to identities when metadata is missing', () => {
		const user = {
			app_metadata: {},
			identities: [{ provider: 'facebook' }]
		} as unknown as User;

		expect(oauthSignInMethodFromUser(user)).toBe('facebook');
	});
});

describe('auth type helpers', () => {
	it('labels oauth providers for display', () => {
		expect(formatSignInMethodLabel('google')).toBe('Google');
		expect(isOAuthSignInMethod('google')).toBe(true);
		expect(isOAuthSignInMethod('email')).toBe(false);
	});
});
