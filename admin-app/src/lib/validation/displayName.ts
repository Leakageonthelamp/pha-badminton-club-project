import type { Locale } from '$lib/i18n';
import { tForLocale } from '$lib/i18n';
import { DEFAULT_LOCALE } from '@repo/ui/i18n';
import { z } from 'zod';

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 50;

/** Letters (Latin + Thai), digits, hyphen, underscore — no spaces or other symbols */
export const DISPLAY_NAME_PATTERN = /^[a-zA-Z0-9_\-\u0E00-\u0E7F]+$/;

const displayNameCharsRefine = (value: string, ctx: z.RefinementCtx, locale: Locale) => {
	if (/\s/.test(value)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: tForLocale(locale, 'validation.displayName.spaces')
		});
		return;
	}

	if (!DISPLAY_NAME_PATTERN.test(value)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: tForLocale(locale, 'validation.displayName.chars')
		});
	}
};

export const buildDisplayNameSchema = (locale: Locale = DEFAULT_LOCALE) =>
	z
		.string()
		.trim()
		.min(
			DISPLAY_NAME_MIN,
			tForLocale(locale, 'validation.displayName.min', { min: DISPLAY_NAME_MIN })
		)
		.max(
			DISPLAY_NAME_MAX,
			tForLocale(locale, 'validation.displayName.max', { max: DISPLAY_NAME_MAX })
		)
		.superRefine((value, ctx) => displayNameCharsRefine(value, ctx, locale));

export const displayNameSchema = buildDisplayNameSchema();

export const validateDisplayName = (value: string, locale: Locale = DEFAULT_LOCALE): string | null => {
	const result = buildDisplayNameSchema(locale).safeParse(value);
	if (result.success) {
		return null;
	}

	return result.error.issues[0]?.message ?? tForLocale(locale, 'validation.displayName.invalid');
};
