import { z } from 'zod';

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 50;

/** Letters (Latin + Thai), digits, hyphen, underscore — no spaces or other symbols */
export const DISPLAY_NAME_PATTERN = /^[a-zA-Z0-9_\-\u0E00-\u0E7F]+$/;

export const DISPLAY_NAME_SPACE_ERROR = 'Display name must not contain spaces';
export const DISPLAY_NAME_CHARS_ERROR = 'Display name must not contain special characters';

const displayNameCharsRefine = (value: string, ctx: z.RefinementCtx) => {
	if (/\s/.test(value)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: DISPLAY_NAME_SPACE_ERROR
		});
		return;
	}

	if (!DISPLAY_NAME_PATTERN.test(value)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: DISPLAY_NAME_CHARS_ERROR
		});
	}
};

export const displayNameSchema = z
	.string()
	.trim()
	.min(DISPLAY_NAME_MIN, `Display name must be at least ${DISPLAY_NAME_MIN} characters`)
	.max(DISPLAY_NAME_MAX, `Display name must not exceed ${DISPLAY_NAME_MAX} characters`)
	.superRefine(displayNameCharsRefine);

export const validateDisplayName = (value: string): string | null => {
	const result = displayNameSchema.safeParse(value);
	if (result.success) {
		return null;
	}

	return result.error.issues[0]?.message ?? 'Invalid display name';
};
