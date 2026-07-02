import { DEFAULT_LOCALE, t, tForLocale, type Locale } from '@repo/ui/i18n';

export const PHONE_EMAIL_DOMAIN = 'phone.ph-badminton.local';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

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
	app_role: 'player' | 'club_admin' | 'super_admin';
	created_at: string;
	updated_at: string;
};

export type CredentialType = 'phone' | 'email';

export type ProfileCredential = {
	type: CredentialType;
	value: string;
};

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

export const formatSignInMethodLabel = (method: SignInMethod): string => {
	switch (method) {
		case 'google':
			return t('signIn.google');
		case 'facebook':
			return t('signIn.facebook');
		case 'phone':
			return t('signIn.phone');
		default:
			return t('signIn.email');
	}
};

export type AuthErrorCode =
	| 'invalid_input'
	| 'email_taken'
	| 'phone_taken'
	| 'account_not_found'
	| 'invalid_credentials'
	| 'register_failed'
	| 'oauth_failed';

export const authErrorMessage = (code: AuthErrorCode, locale?: Locale): string =>
	tForLocale(locale ?? DEFAULT_LOCALE, `auth.error.${code}`);
