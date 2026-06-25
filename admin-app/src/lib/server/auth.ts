import { createSupabaseAdminClient } from '$lib/supabase/server';
import { isEmail, normalizePhone, validateIdentifier } from '$lib/validation/identifier';
import { z } from 'zod';

export { isEmail, normalizePhone } from '$lib/validation/identifier';

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

const loginSchema = z
	.object({
		identifier: z.string().trim().min(1, 'Enter your email or phone number'),
		password: z.string().min(1, 'Password is required')
	})
	.superRefine((data, ctx) => identifierRefine(data.identifier, ctx));

export type LoginInput = z.infer<typeof loginSchema>;

export const parseLoginInput = (input: { identifier: string; password: string }) =>
	loginSchema.safeParse(input);

export const resolveLoginEmail = async (identifier: string): Promise<string | null> => {
	const trimmed = identifier.trim();

	if (isEmail(trimmed)) {
		return trimmed.toLowerCase();
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
