import { t } from '@repo/ui/i18n';
import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 10;

const HAS_UPPERCASE = /[A-Z]/;
const HAS_SPECIAL = /[^A-Za-z0-9]/;

export const validateRegisterPassword = (value: string): string | null => {
	if (value.length < PASSWORD_MIN_LENGTH) {
		return t('validation.password.minLength', { min: PASSWORD_MIN_LENGTH });
	}

	if (!HAS_UPPERCASE.test(value)) {
		return t('validation.password.uppercase');
	}

	if (!HAS_SPECIAL.test(value)) {
		return t('validation.password.special');
	}

	return null;
};

export const registerPasswordSchema = z.string().superRefine((value, ctx) => {
	const message = validateRegisterPassword(value);
	if (message) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message
		});
	}
});
