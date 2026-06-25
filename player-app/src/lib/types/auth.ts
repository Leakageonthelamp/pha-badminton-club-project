export const PHONE_EMAIL_DOMAIN = 'phone.ph-badminton.local';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type Profile = {
	id: string;
	display_name: string;
	avatar_url: string | null;
	email: string | null;
	phone: string | null;
	app_role: 'player' | 'club_admin' | 'super_admin';
	created_at: string;
	updated_at: string;
};

export type AuthErrorCode =
	| 'invalid_input'
	| 'email_taken'
	| 'phone_taken'
	| 'account_not_found'
	| 'invalid_credentials'
	| 'register_failed'
	| 'oauth_failed';

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
	invalid_input: 'Please check your input and try again.',
	email_taken: 'This email is already registered.',
	phone_taken: 'This phone number is already registered.',
	account_not_found: 'No account found for that email or phone number.',
	invalid_credentials: 'Incorrect password. Please try again.',
	register_failed: 'Could not create your account. Please try again.',
	oauth_failed: 'Social login failed. Please try again.'
};

export const authErrorMessage = (code: AuthErrorCode): string =>
	AUTH_ERROR_MESSAGES[code] ?? 'Something went wrong. Please try again.';
