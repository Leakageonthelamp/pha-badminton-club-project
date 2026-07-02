import type { Locale } from '$lib/i18n';
import { tForLocale } from '$lib/i18n';
import { DEFAULT_LOCALE } from '@repo/ui/i18n';
import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 10;

const HAS_UPPERCASE = /[A-Z]/;
const HAS_SPECIAL = /[^A-Za-z0-9]/;

export const validateRegisterPassword = (
	value: string,
	locale: Locale = DEFAULT_LOCALE
): string | null => {
	if (value.length < PASSWORD_MIN_LENGTH) {
		return tForLocale(locale, 'validation.password.minLength', { min: PASSWORD_MIN_LENGTH });
	}

	if (!HAS_UPPERCASE.test(value)) {
		return tForLocale(locale, 'validation.password.uppercase');
	}

	if (!HAS_SPECIAL.test(value)) {
		return tForLocale(locale, 'validation.password.special');
	}

	return null;
};

export const buildRegisterPasswordSchema = (locale: Locale = DEFAULT_LOCALE) =>
	z.string().superRefine((value, ctx) => {
		const message = validateRegisterPassword(value, locale);
		if (message) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message
			});
		}
	});

export const registerPasswordSchema = buildRegisterPasswordSchema();
