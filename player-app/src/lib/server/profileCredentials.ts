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
import type { Locale } from '@repo/ui/i18n';
import { tForLocale } from '@repo/ui/i18n';
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

	const { error } = await admin
		.from('profiles')
		.update({ sign_in_method: method })
		.eq('id', user.id)
		.neq('sign_in_method', method);

	if (error) {
		console.error('Failed to set OAuth sign_in_method', { userId: user.id, method, error });
	}
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
	input,
	locale
}: {
	admin: SupabaseClient;
	supabase: SupabaseClient;
	userId: string;
	profile: Pick<Profile, 'email' | 'phone' | 'sign_in_method'>;
	input: CredentialsInput;
	locale: Locale;
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
				fieldErrors.signInPreference?.[0] ?? authErrorMessage('invalid_input', locale),
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
		const msg = tForLocale(locale, 'profile.credentials.error.currentPasswordRequired');
		return {
			ok: false,
			code: 'invalid_input',
			error: msg,
			fieldErrors: { currentPassword: msg },
			values: input
		};
	}

	if (input.email.trim() && !email) {
		const msg = tForLocale(locale, 'validation.identifier.invalidEmail');
		return {
			ok: false,
			code: 'invalid_input',
			error: msg,
			fieldErrors: { email: msg },
			values: input
		};
	}

	if (input.phone.trim() && !phone) {
		const msg = tForLocale(locale, 'validation.identifier.invalidPhone');
		return {
			ok: false,
			code: 'invalid_input',
			error: msg,
			fieldErrors: { phone: msg },
			values: input
		};
	}

	const passwordSignInPreference = parsed.data.signInPreference;

	if (!oauthAccount) {
		if (passwordSignInPreference === 'email' && !email) {
			const msg = tForLocale(locale, 'profile.credentials.error.emailRequiredForPreference');
			return {
				ok: false,
				code: 'invalid_input',
				error: msg,
				fieldErrors: { email: msg },
				values: input
			};
		}

		if (passwordSignInPreference === 'phone' && !phone) {
			const msg = tForLocale(locale, 'profile.credentials.error.phoneRequiredForPreference');
			return {
				ok: false,
				code: 'invalid_input',
				error: msg,
				fieldErrors: { phone: msg },
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
			error: tForLocale(locale, 'profile.credentials.error.noChanges'),
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
				error: authErrorMessage('email_taken', locale),
				fieldErrors: { email: authErrorMessage('email_taken', locale) },
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
				error: authErrorMessage('phone_taken', locale),
				fieldErrors: { phone: authErrorMessage('phone_taken', locale) },
				values: input
			};
		}
	}

	const authEmail = await resolveAuthEmailForUser(admin, userId);
	if (!authEmail && !oauthAccount) {
		return {
			ok: false,
			code: 'register_failed',
			error: tForLocale(locale, 'profile.credentials.error.verifyFailed'),
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
				error: authErrorMessage('invalid_credentials', locale),
				fieldErrors: { currentPassword: authErrorMessage('invalid_credentials', locale) },
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
					error: authErrorMessage(emailChanged ? 'email_taken' : 'phone_taken', locale),
					values: input
				};
			}

			return {
				ok: false,
				code: 'register_failed',
				error: tForLocale(locale, 'profile.credentials.error.updateFailed'),
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
				? authErrorMessage('email_taken', locale)
				: authErrorMessage('phone_taken', locale);
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
			error: tForLocale(locale, 'profile.updateError'),
			values: input
		};
	}

	return {
		ok: true,
		signInPreference: oauthAccount ? null : passwordSignInPreference
	};
};
