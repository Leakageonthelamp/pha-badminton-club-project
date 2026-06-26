import {
	authErrorMessage,
	isOAuthSignInMethod,
	isPasswordSignInMethod,
	isSyntheticAuthEmail,
	type AuthErrorCode,
	type PasswordSignInPreference,
	type Profile,
	type SignInMethod
} from '$lib/types/auth';
import { isEmail, normalizePhone } from '$lib/validation/identifier';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { phoneToAuthEmail } from './auth';
import { z } from 'zod';

export type CredentialsInput = {
	email: string;
	phone: string;
	signInPreference: PasswordSignInPreference;
	currentPassword: string;
};

export type CredentialsFieldErrors = {
	email?: string | null;
	phone?: string | null;
	signInPreference?: string | null;
	currentPassword?: string | null;
};

const credentialsSchema = z.object({
	email: z.string(),
	phone: z.string(),
	signInPreference: z.enum(['email', 'phone']),
	currentPassword: z.string()
});

const parseEmail = (raw: string): string | null => {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	return isEmail(trimmed) ? trimmed.toLowerCase() : null;
};

const parsePhone = (raw: string): string | null => {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	return normalizePhone(trimmed);
};

export const parseCredentialsInput = (input: CredentialsInput) => credentialsSchema.safeParse(input);

export const oauthSignInMethodFromUser = (user: User): SignInMethod | null => {
	const provider = user.app_metadata?.provider;
	if (provider === 'google' || provider === 'facebook') {
		return provider;
	}

	const identity = user.identities?.find(
		(entry) => entry.provider === 'google' || entry.provider === 'facebook'
	);
	if (identity?.provider === 'google' || identity?.provider === 'facebook') {
		return identity.provider;
	}

	return null;
};

export const ensureOAuthSignInMethod = async (
	admin: SupabaseClient,
	user: User
): Promise<void> => {
	const method = oauthSignInMethodFromUser(user);
	if (!method) return;

	await admin.from('profiles').update({ sign_in_method: method }).eq('id', user.id);
};

const resolveAuthEmailForUser = async (
	admin: SupabaseClient,
	userId: string
): Promise<string | null> => {
	const { data, error } = await admin.auth.admin.getUserById(userId);
	if (error || !data.user?.email) {
		return null;
	}

	return data.user.email;
};

export const updateProfileCredentials = async ({
	admin,
	supabase,
	userId,
	profile,
	input
}: {
	admin: SupabaseClient;
	supabase: SupabaseClient;
	userId: string;
	profile: Pick<Profile, 'email' | 'phone' | 'sign_in_method'>;
	input: CredentialsInput;
}): Promise<
	| { ok: true; signInPreference: PasswordSignInPreference | null }
	| { ok: false; code: AuthErrorCode; error: string; fieldErrors?: CredentialsFieldErrors; values?: CredentialsInput }
> => {
	const parsed = parseCredentialsInput(input);
	if (!parsed.success) {
		const fieldErrors = parsed.error.flatten().fieldErrors;
		return {
			ok: false,
			code: 'invalid_input',
			error:
				fieldErrors.signInPreference?.[0] ?? authErrorMessage('invalid_input'),
			fieldErrors: {
				signInPreference: fieldErrors.signInPreference?.[0] ?? null
			},
			values: input
		};
	}

	const email = parseEmail(input.email);
	const phone = parsePhone(input.phone);
	const oauthAccount = isOAuthSignInMethod(profile.sign_in_method);

	if (!oauthAccount && !parsed.data.currentPassword.trim()) {
		return {
			ok: false,
			code: 'invalid_input',
			error: 'Enter your current password',
			fieldErrors: { currentPassword: 'Enter your current password' },
			values: input
		};
	}

	if (input.email.trim() && !email) {
		return {
			ok: false,
			code: 'invalid_input',
			error: 'Enter a valid email address',
			fieldErrors: { email: 'Enter a valid email address' },
			values: input
		};
	}

	if (input.phone.trim() && !phone) {
		return {
			ok: false,
			code: 'invalid_input',
			error: 'Enter a valid Thai phone number (e.g. 0812345678)',
			fieldErrors: { phone: 'Enter a valid Thai phone number (e.g. 0812345678)' },
			values: input
		};
	}

	const passwordSignInPreference = parsed.data.signInPreference;

	if (!oauthAccount) {
		if (passwordSignInPreference === 'email' && !email) {
			return {
				ok: false,
				code: 'invalid_input',
				error: 'Add an email address before choosing email as your default sign-in',
				fieldErrors: { email: 'Email is required for email sign-in preference' },
				values: input
			};
		}

		if (passwordSignInPreference === 'phone' && !phone) {
			return {
				ok: false,
				code: 'invalid_input',
				error: 'Add a phone number before choosing phone as your default sign-in',
				fieldErrors: { phone: 'Phone number is required for phone sign-in preference' },
				values: input
			};
		}
	}

	const emailChanged = (profile.email ?? null) !== email;
	const phoneChanged = (profile.phone ?? null) !== phone;
	const preferenceChanged =
		!oauthAccount && isPasswordSignInMethod(profile.sign_in_method)
			? profile.sign_in_method !== passwordSignInPreference
			: false;

	if (!emailChanged && !phoneChanged && !preferenceChanged) {
		return {
			ok: false,
			code: 'invalid_input',
			error: 'No credential changes to save.',
			values: input
		};
	}

	if (email) {
		const { data: existingEmail } = await admin
			.from('profiles')
			.select('id')
			.eq('email', email)
			.neq('id', userId)
			.maybeSingle();

		if (existingEmail) {
			return {
				ok: false,
				code: 'email_taken',
				error: authErrorMessage('email_taken'),
				fieldErrors: { email: authErrorMessage('email_taken') },
				values: input
			};
		}
	}

	if (phone) {
		const { data: existingPhone } = await admin
			.from('profiles')
			.select('id')
			.eq('phone', phone)
			.neq('id', userId)
			.maybeSingle();

		if (existingPhone) {
			return {
				ok: false,
				code: 'phone_taken',
				error: authErrorMessage('phone_taken'),
				fieldErrors: { phone: authErrorMessage('phone_taken') },
				values: input
			};
		}
	}

	const authEmail = await resolveAuthEmailForUser(admin, userId);
	if (!authEmail && !oauthAccount) {
		return {
			ok: false,
			code: 'register_failed',
			error: 'Could not verify your account. Please try again.',
			values: input
		};
	}

	if (!oauthAccount && authEmail) {
		const { error: passwordError } = await supabase.auth.signInWithPassword({
			email: authEmail,
			password: parsed.data.currentPassword
		});

		if (passwordError) {
			return {
				ok: false,
				code: 'invalid_credentials',
				error: authErrorMessage('invalid_credentials'),
				fieldErrors: { currentPassword: authErrorMessage('invalid_credentials') },
				values: input
			};
		}
	}

	let nextAuthEmail: string | null = null;

	if (!oauthAccount) {
		const phonePrimary =
			isSyntheticAuthEmail(authEmail) ||
			profile.sign_in_method === 'phone' ||
			passwordSignInPreference === 'phone';

		if (phoneChanged && phone && phonePrimary) {
			nextAuthEmail = phoneToAuthEmail(phone);
		} else if (emailChanged && email && !phonePrimary) {
			nextAuthEmail = email;
		}
	}
	if (nextAuthEmail && nextAuthEmail !== authEmail) {
		const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, {
			email: nextAuthEmail,
			email_confirm: true
		});

		if (authUpdateError) {
			if (authUpdateError.message.toLowerCase().includes('already')) {
				return {
					ok: false,
					code: emailChanged ? 'email_taken' : 'phone_taken',
					error: authErrorMessage(emailChanged ? 'email_taken' : 'phone_taken'),
					values: input
				};
			}

			return {
				ok: false,
				code: 'register_failed',
				error: 'Could not update sign-in details. Please try again.',
				values: input
			};
		}
	}

	const profileUpdates: {
		email: string | null;
		phone: string | null;
		sign_in_method?: PasswordSignInPreference;
	} = {
		email,
		phone
	};

	if (!oauthAccount) {
		profileUpdates.sign_in_method = passwordSignInPreference;
	}

	const { error: profileError } = await admin
		.from('profiles')
		.update(profileUpdates)
		.eq('id', userId);

	if (profileError) {
		if (profileError.code === '23505') {
			const message = profileError.message.includes('email')
				? authErrorMessage('email_taken')
				: authErrorMessage('phone_taken');
			return {
				ok: false,
				code: profileError.message.includes('email') ? 'email_taken' : 'phone_taken',
				error: message,
				values: input
			};
		}

		return {
			ok: false,
			code: 'register_failed',
			error: 'Could not update profile. Please try again.',
			values: input
		};
	}

	return {
		ok: true,
		signInPreference: oauthAccount ? null : passwordSignInPreference
	};
};
