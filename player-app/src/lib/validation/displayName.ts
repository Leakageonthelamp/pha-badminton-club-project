import { t } from '@repo/ui/i18n';
import { z } from 'zod';

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 50;

/** Letters (Latin + Thai), digits, hyphen, underscore — no spaces or other symbols */
export const DISPLAY_NAME_PATTERN = /^[a-zA-Z0-9_\-\u0E00-\u0E7F]+$/;

const displayNameCharsRefine = (value: string, ctx: z.RefinementCtx) => {
	if (/\s/.test(value)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: t('validation.displayName.noSpaces')
		});
		return;
	}

	if (!DISPLAY_NAME_PATTERN.test(value)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: t('validation.displayName.invalidChars')
		});
	}
};

export const displayNameSchema = z
	.string()
	.trim()
	.superRefine((value, ctx) => {
		if (value.length < DISPLAY_NAME_MIN) {
			ctx.addIssue({
				code: z.ZodIssueCode.too_small,
				minimum: DISPLAY_NAME_MIN,
				type: 'string',
				inclusive: true,
				message: t('validation.displayName.min', { min: DISPLAY_NAME_MIN })
			});
			return;
		}

		if (value.length > DISPLAY_NAME_MAX) {
			ctx.addIssue({
				code: z.ZodIssueCode.too_big,
				maximum: DISPLAY_NAME_MAX,
				type: 'string',
				inclusive: true,
				message: t('validation.displayName.max', { max: DISPLAY_NAME_MAX })
			});
			return;
		}

		displayNameCharsRefine(value, ctx);
	});

export const validateDisplayName = (value: string): string | null => {
	const result = displayNameSchema.safeParse(value);
	if (result.success) {
		return null;
	}

	return result.error.issues[0]?.message ?? t('validation.displayName.invalid');
};
