import { describe, expect, it } from 'vitest';
import { oauthAvatarFromUser } from './oauthProfile';
import type { User } from '@supabase/supabase-js';

describe('oauthAvatarFromUser', () => {
	it('prefers avatar_url then picture from user metadata', () => {
		const user = {
			user_metadata: {
				avatar_url: 'https://lh3.googleusercontent.com/a/example=s96-c',
				picture: 'https://example.com/other.jpg'
			}
		} as Pick<User, 'user_metadata'> as User;

		expect(oauthAvatarFromUser(user)).toBe('https://lh3.googleusercontent.com/a/example=s96-c');
	});

	it('falls back to picture when avatar_url is missing', () => {
		const user = {
			user_metadata: {
				picture: 'https://lh3.googleusercontent.com/a/example=s96-c'
			}
		} as Pick<User, 'user_metadata'> as User;

		expect(oauthAvatarFromUser(user)).toBe('https://lh3.googleusercontent.com/a/example=s96-c');
	});
});
