import { USER_DELETE_CONFIRM_PHRASE } from '$lib/config/user';
import { createSupabaseAdminClient } from '$lib/supabase/server';
import type { AppRole, Profile, SignInMethod } from '$lib/types/auth';
import { isPasswordSignInMethod } from '$lib/types/auth';
import { validateRegisterPassword } from '$lib/validation/password';
import type { SupabaseClient } from '@supabase/supabase-js';

export type UserManagementErrorCode =
	| 'not_super_admin'
	| 'self_action'
	| 'user_not_found'
	| 'oauth_only'
	| 'invalid_password'
	| 'cannot_delete_super_admin'
	| 'owns_clubs'
	| 'invalid_confirm'
	| 'auth_error';

export const USER_MANAGEMENT_ERRORS: Record<UserManagementErrorCode, string> = {
	not_super_admin: 'Super admin access required.',
	self_action: 'You cannot perform this action on your own account.',
	user_not_found: 'User not found.',
	oauth_only: 'Password reset is only available for email or phone sign-in accounts.',
	invalid_password: 'Password does not meet requirements.',
	cannot_delete_super_admin: 'Super admin accounts cannot be deleted.',
	owns_clubs: 'Reassign club ownership before deleting this user.',
	invalid_confirm: `Type "${USER_DELETE_CONFIRM_PHRASE}" to confirm deletion.`,
	auth_error: 'Could not complete the action. Please try again.'
};

export type UserManagementResult =
	| { ok: true }
	| { ok: false; code: UserManagementErrorCode; message: string };

const fail = (code: UserManagementErrorCode): UserManagementResult => ({
	ok: false,
	code,
	message: USER_MANAGEMENT_ERRORS[code]
});

export const assertCallerCanManageUser = (
	callerRole: AppRole | null,
	callerId: string,
	targetId: string
): UserManagementResult => {
	if (callerRole !== 'super_admin') {
		return fail('not_super_admin');
	}

	if (callerId === targetId) {
		return fail('self_action');
	}

	return { ok: true };
};

export const assertCanDeleteUser = (
	targetProfile: Pick<Profile, 'app_role'>,
	ownedClubCount: number
): UserManagementResult => {
	if (targetProfile.app_role === 'super_admin') {
		return fail('cannot_delete_super_admin');
	}

	if (ownedClubCount > 0) {
		return fail('owns_clubs');
	}

	return { ok: true };
};

export const assertCanResetPassword = (
	signInMethod: SignInMethod
): UserManagementResult => {
	if (!isPasswordSignInMethod(signInMethod)) {
		return fail('oauth_only');
	}

	return { ok: true };
};

export const loadProfileForManagement = async (
	supabase: SupabaseClient,
	userId: string
): Promise<Profile | null> => {
	const { data, error } = await supabase
		.from('profiles')
		.select('*')
		.eq('id', userId)
		.maybeSingle();

	if (error) {
		console.error('Failed to load profile for management', error);
		return null;
	}

	return (data as Profile | null) ?? null;
};

export const countOwnedClubs = async (
	supabase: SupabaseClient,
	userId: string
): Promise<number> => {
	const { count, error } = await supabase
		.from('clubs')
		.select('*', { count: 'exact', head: true })
		.eq('owner_id', userId);

	if (error) {
		console.error('Failed to count owned clubs', error);
		return 0;
	}

	return count ?? 0;
};

export const resetUserPassword = async (
	targetUserId: string,
	password: string,
	targetSignInMethod: SignInMethod
): Promise<UserManagementResult> => {
	const passwordCheck = validateRegisterPassword(password);
	if (passwordCheck) {
		return { ok: false, code: 'invalid_password', message: passwordCheck };
	}

	const resetCheck = assertCanResetPassword(targetSignInMethod);
	if (!resetCheck.ok) {
		return resetCheck;
	}

	const admin = createSupabaseAdminClient();
	const { error } = await admin.auth.admin.updateUserById(targetUserId, { password });

	if (error) {
		console.error('Failed to reset user password', error);
		return fail('auth_error');
	}

	return { ok: true };
};

const BAN_DURATION = '876000h';

export const banUser = async (targetUserId: string): Promise<UserManagementResult> => {
	const admin = createSupabaseAdminClient();
	const { error } = await admin.auth.admin.updateUserById(targetUserId, {
		ban_duration: BAN_DURATION
	});

	if (error) {
		console.error('Failed to ban user', error);
		return fail('auth_error');
	}

	return { ok: true };
};

export const unbanUser = async (targetUserId: string): Promise<UserManagementResult> => {
	const admin = createSupabaseAdminClient();
	const { error } = await admin.auth.admin.updateUserById(targetUserId, {
		ban_duration: 'none'
	});

	if (error) {
		console.error('Failed to unban user', error);
		return fail('auth_error');
	}

	return { ok: true };
};

export const deleteUser = async (
	supabase: SupabaseClient,
	targetUserId: string,
	confirmText: string,
	targetProfile: Pick<Profile, 'app_role'>
): Promise<UserManagementResult> => {
	if (confirmText !== USER_DELETE_CONFIRM_PHRASE) {
		return fail('invalid_confirm');
	}

	const ownedClubCount = await countOwnedClubs(supabase, targetUserId);
	const deleteCheck = assertCanDeleteUser(targetProfile, ownedClubCount);
	if (!deleteCheck.ok) {
		return deleteCheck;
	}

	const admin = createSupabaseAdminClient();
	const { error } = await admin.auth.admin.deleteUser(targetUserId);

	if (error) {
		console.error('Failed to delete user', error);
		return fail('auth_error');
	}

	return { ok: true };
};

export type AuthUserSummary = {
	lastSignInAt: string | null;
	emailConfirmedAt: string | null;
	bannedUntil: string | null;
	isBanned: boolean;
	providers: string[];
};

export const loadAuthUserSummary = async (userId: string): Promise<AuthUserSummary | null> => {
	const admin = createSupabaseAdminClient();
	const { data, error } = await admin.auth.admin.getUserById(userId);

	if (error || !data.user) {
		console.error('Failed to load auth user', error);
		return null;
	}

	const user = data.user;
	const bannedUntil = user.banned_until ?? null;
	const isBanned = bannedUntil ? new Date(bannedUntil) > new Date() : false;
	const providers = (user.identities ?? []).map((identity) => identity.provider);

	return {
		lastSignInAt: user.last_sign_in_at ?? null,
		emailConfirmedAt: user.email_confirmed_at ?? null,
		bannedUntil,
		isBanned,
		providers
	};
};
