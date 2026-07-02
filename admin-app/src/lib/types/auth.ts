import type { Locale } from '@repo/ui/i18n';
import { DEFAULT_LOCALE } from '@repo/ui/i18n';
import { tForLocale } from '@repo/ui/i18n/i18n.svelte';

export type AppRole = 'player' | 'club_admin' | 'super_admin';

export const appRoleLabel = (role: AppRole, locale?: Locale): string => {
	switch (role) {
		case 'player':
			return tForLocale(locale ?? DEFAULT_LOCALE, 'role.player');
		case 'club_admin':
			return tForLocale(locale ?? DEFAULT_LOCALE, 'role.clubAdmin');
		case 'super_admin':
			return tForLocale(locale ?? DEFAULT_LOCALE, 'role.superAdmin');
		default:
			return role;
	}
};

export type SignInMethod = 'email' | 'phone' | 'google' | 'facebook';
export type PasswordSignInPreference = 'email' | 'phone';

export type Profile = {
	id: string;
	display_name: string;
	tag: string;
	avatar_url: string | null;
	email: string | null;
	phone: string | null;
	sign_in_method: SignInMethod;
	app_role: AppRole;
	created_at: string;
	updated_at: string;
};

export type CredentialType = 'phone' | 'email';

export type ProfileCredential = {
	type: CredentialType;
	value: string;
};

export const PHONE_EMAIL_DOMAIN = 'phone.ph-badminton.local';
/** Auth cookie maxAge — 30 days for admin-app (player-app stays 7 days). */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export const isOAuthSignInMethod = (
	method: SignInMethod
): method is 'google' | 'facebook' => method === 'google' || method === 'facebook';

export const isPasswordSignInMethod = (
	method: SignInMethod
): method is PasswordSignInPreference => method === 'email' || method === 'phone';

export const isSyntheticAuthEmail = (email: string | null | undefined): boolean =>
	!!email && email.endsWith(`@${PHONE_EMAIL_DOMAIN}`);

/** Preferred password sign-in identifier for display. */
export const getProfileCredential = (
	profile: Pick<Profile, 'email' | 'phone' | 'sign_in_method'>
): ProfileCredential | null => {
	if (isOAuthSignInMethod(profile.sign_in_method)) {
		return null;
	}

	if (profile.sign_in_method === 'phone' && profile.phone) {
		return { type: 'phone', value: profile.phone };
	}

	if (profile.sign_in_method === 'email' && profile.email) {
		return { type: 'email', value: profile.email };
	}

	if (profile.phone) {
		return { type: 'phone', value: profile.phone };
	}

	if (profile.email) {
		return { type: 'email', value: profile.email };
	}

	return null;
};

export const formatSignInMethodLabel = (method: SignInMethod, locale?: Locale): string => {
	switch (method) {
		case 'google':
			return tForLocale(locale ?? DEFAULT_LOCALE, 'signInMethod.google');
		case 'facebook':
			return tForLocale(locale ?? DEFAULT_LOCALE, 'signInMethod.facebook');
		case 'phone':
			return tForLocale(locale ?? DEFAULT_LOCALE, 'signInMethod.phone');
		default:
			return tForLocale(locale ?? DEFAULT_LOCALE, 'signInMethod.email');
	}
};

export type AuthErrorCode =
	| 'invalid_input'
	| 'email_taken'
	| 'phone_taken'
	| 'account_not_found'
	| 'invalid_credentials'
	| 'register_failed'
	| 'oauth_failed'
	| 'access_denied';

const AUTH_ERROR_KEYS: Record<AuthErrorCode, string> = {
	invalid_input: 'auth.error.invalidInput',
	email_taken: 'auth.error.emailTaken',
	phone_taken: 'auth.error.phoneTaken',
	account_not_found: 'auth.error.accountNotFound',
	invalid_credentials: 'auth.error.invalidCredentials',
	register_failed: 'auth.error.registerFailed',
	oauth_failed: 'auth.error.oauthFailed',
	access_denied: 'auth.error.accessDenied'
};

export const authErrorMessage = (code: AuthErrorCode, locale?: Locale): string =>
	tForLocale(locale ?? DEFAULT_LOCALE, AUTH_ERROR_KEYS[code] ?? 'auth.error.generic');
