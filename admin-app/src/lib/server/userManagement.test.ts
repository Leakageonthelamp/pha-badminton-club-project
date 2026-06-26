import { describe, expect, it } from 'vitest';
import {
	assertCallerCanManageUser,
	assertCanDeleteUser,
	assertCanResetPassword,
	isAuthUserBanned
} from './userManagement';

describe('userManagement guards', () => {
	it('assertCallerCanManageUser requires super admin and blocks self', () => {
		expect(assertCallerCanManageUser('super_admin', 'a', 'b').ok).toBe(true);
		expect(assertCallerCanManageUser('club_admin', 'a', 'b').ok).toBe(false);
		expect(assertCallerCanManageUser('super_admin', 'a', 'a').ok).toBe(false);
	});

	it('assertCanDeleteUser blocks super admin and club owners', () => {
		expect(assertCanDeleteUser({ app_role: 'player' }, 0).ok).toBe(true);
		expect(assertCanDeleteUser({ app_role: 'super_admin' }, 0).ok).toBe(false);
		expect(assertCanDeleteUser({ app_role: 'club_admin' }, 1).ok).toBe(false);
	});

	it('assertCanResetPassword allows email and phone only', () => {
		expect(assertCanResetPassword('email').ok).toBe(true);
		expect(assertCanResetPassword('phone').ok).toBe(true);
		expect(assertCanResetPassword('google').ok).toBe(false);
		expect(assertCanResetPassword('facebook').ok).toBe(false);
	});

	it('isAuthUserBanned treats future banned_until as banned', () => {
		const future = new Date(Date.now() + 60_000).toISOString();
		const past = new Date(Date.now() - 60_000).toISOString();

		expect(isAuthUserBanned(future)).toBe(true);
		expect(isAuthUserBanned(past)).toBe(false);
		expect(isAuthUserBanned(null)).toBe(false);
	});
});
