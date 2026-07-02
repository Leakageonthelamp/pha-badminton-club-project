import { PHONE_EMAIL_DOMAIN } from '$lib/types/auth';
import { createSupabaseAdminClient } from '$lib/supabase/server';
import { ensureProfileTag } from '$lib/server/tag';
import { displayNameSchema } from '$lib/validation/displayName';
import { isEmail, normalizePhone, validateIdentifier } from '$lib/validation/identifier';
import { registerPasswordSchema } from '$lib/validation/password';
import { t } from '@repo/ui/i18n';
import { z } from 'zod';

export { isEmail, normalizePhone } from '$lib/validation/identifier';

export const phoneToAuthEmail = (phone: string): string => {
	const normalized = normalizePhone(phone);
	if (!normalized) {
		throw new Error('invalid phone');
	}

	return `${normalized.replace('+', '')}@${PHONE_EMAIL_DOMAIN}`;
};

const identifierRefine = (value: string, ctx: z.RefinementCtx) => {
	const message = validateIdentifier(value);
	if (message) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['identifier'],
			message
		});
	}
};

const registerSchema = z
	.object({
		displayName: displayNameSchema,
		identifier: z.string().trim().min(1),
		password: registerPasswordSchema,
		confirmPassword: z.string().min(1)
	})
	.superRefine((data, ctx) => {
		identifierRefine(data.identifier, ctx);

		if (!data.identifier.trim()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['identifier'],
				message: t('auth.error.identifierRequired')
			});
		}

		if (!data.confirmPassword.trim()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['confirmPassword'],
				message: t('auth.error.confirmPasswordRequired')
			});
		}

		if (data.password !== data.confirmPassword) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['confirmPassword'],
				message: t('auth.error.passwordsMismatch')
			});
		}
	});

const loginSchema = z
	.object({
		identifier: z.string().trim().min(1),
		password: z.string().min(1)
	})
	.superRefine((data, ctx) => {
		if (!data.identifier.trim()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['identifier'],
				message: t('auth.error.identifierRequired')
			});
		} else {
			identifierRefine(data.identifier, ctx);
		}

		if (!data.password) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['password'],
				message: t('auth.error.passwordRequired')
			});
		}
	});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const parseRegisterInput = (input: {
	displayName: string;
	identifier: string;
	password: string;
	confirmPassword: string;
}) => registerSchema.safeParse(input);

export const parseLoginInput = (input: { identifier: string; password: string }) =>
	loginSchema.safeParse(input);

export const resolveLoginEmail = async (identifier: string): Promise<string | null> => {
	const trimmed = identifier.trim();

	if (isEmail(trimmed)) {
		const email = trimmed.toLowerCase();
		const admin = createSupabaseAdminClient();
		const { data: profile } = await admin
			.from('profiles')
			.select('id')
			.eq('email', email)
			.maybeSingle();

		if (profile) {
			const { data, error } = await admin.auth.admin.getUserById(profile.id);
			if (error || !data.user?.email) {
				return null;
			}

			return data.user.email;
		}

		return email;
	}

	const phone = normalizePhone(trimmed);
	if (!phone) {
		return null;
	}

	const admin = createSupabaseAdminClient();
	const { data: profile } = await admin
		.from('profiles')
		.select('id')
		.eq('phone', phone)
		.maybeSingle();

	if (!profile) {
		return null;
	}

	const { data, error } = await admin.auth.admin.getUserById(profile.id);
	if (error || !data.user?.email) {
		return null;
	}

	return data.user.email;
};

export const registerUser = async (input: RegisterInput) => {
	const admin = createSupabaseAdminClient();
	const email = isEmail(input.identifier) ? input.identifier.trim().toLowerCase() : null;
	const phone = email ? null : normalizePhone(input.identifier);

	if (!email && !phone) {
		return { ok: false as const, code: 'invalid_input' as const };
	}

	if (email) {
		const { data: existingEmail } = await admin
			.from('profiles')
			.select('id')
			.eq('email', email)
			.maybeSingle();

		if (existingEmail) {
			return { ok: false as const, code: 'email_taken' as const };
		}
	}

	if (phone) {
		const { data: existingPhone } = await admin
			.from('profiles')
			.select('id')
			.eq('phone', phone)
			.maybeSingle();

		if (existingPhone) {
			return { ok: false as const, code: 'phone_taken' as const };
		}
	}

	const authEmail = email ?? phoneToAuthEmail(phone!);
	const { data, error } = await admin.auth.admin.createUser({
		email: authEmail,
		password: input.password,
		email_confirm: true,
		user_metadata: {
			display_name: input.displayName.trim(),
			phone
		}
	});

	if (error || !data.user) {
		if (error?.message?.toLowerCase().includes('already')) {
			return {
				ok: false as const,
				code: email ? ('email_taken' as const) : ('phone_taken' as const)
			};
		}

		return { ok: false as const, code: 'register_failed' as const };
	}

	await ensureProfileTag(admin, data.user.id);

	await admin
		.from('profiles')
		.update({
			sign_in_method: email ? 'email' : 'phone',
			...(email ? { email } : {}),
			...(phone ? { phone } : {})
		})
		.eq('id', data.user.id);

	return { ok: true as const, authEmail };
};
