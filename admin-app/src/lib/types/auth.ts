export const PHONE_EMAIL_DOMAIN = 'phone.ph-badminton.local';
/** Auth cookie maxAge — 30 days for admin-app (player-app stays 7 days). */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export type AppRole = 'player' | 'club_admin' | 'super_admin';

const APP_ROLE_LABELS: Record<AppRole, string> = {
	player: 'Player',
	club_admin: 'Club admin',
	super_admin: 'Super admin'
};

export const appRoleLabel = (role: AppRole): string => APP_ROLE_LABELS[role] ?? role;

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
			return 'Google';
		case 'facebook':
			return 'Facebook';
		case 'phone':
			return 'Phone';
		default:
			return 'Email';
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

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
	invalid_input: 'Please check your input and try again.',
	email_taken: 'This email is already registered.',
	phone_taken: 'This phone number is already registered.',
	account_not_found: 'No account found for that email or phone number.',
	invalid_credentials: 'Incorrect password. Please try again.',
	register_failed: 'Could not create your account. Please try again.',
	oauth_failed: 'Social login failed. Please try again.',
	access_denied: 'Access denied. Super admin privileges required.'
};

export const authErrorMessage = (code: AuthErrorCode): string =>
	AUTH_ERROR_MESSAGES[code] ?? 'Something went wrong. Please try again.';
