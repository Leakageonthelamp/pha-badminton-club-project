import { t } from '@repo/ui/i18n';
import { z } from 'zod';

/** # + exactly 4 ASCII letters or digits */
export const TAG_PATTERN = /^#[a-zA-Z0-9]{4}$/;

export const normalizeTag = (value: string): string => value.trim().toLowerCase();

export const tagSuffixFromFull = (tag: string): string => (tag.startsWith('#') ? tag.slice(1) : tag);

export const toFullTag = (suffix: string): string => `#${suffix.trim().toLowerCase()}`;

export const tagSchema = z
	.string()
	.trim()
	.superRefine((value, ctx) => {
		if (!TAG_PATTERN.test(value)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: t('validation.tag.invalid')
			});
		}
	})
	.transform(normalizeTag);

export const validateTag = (value: string): string | null => {
	const result = tagSchema.safeParse(value);
	if (result.success) {
		return null;
	}

	return result.error.issues[0]?.message ?? t('validation.tag.invalid');
};
