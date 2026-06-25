import { z } from 'zod';

/** # + exactly 4 ASCII letters or digits */
export const TAG_PATTERN = /^#[a-zA-Z0-9]{4}$/;

export const TAG_FORMAT_ERROR = 'Tag must be # followed by 4 letters or numbers (e.g. #1234, #sd23).';

export const TAG_SUFFIX_FORMAT_ERROR = 'Enter 4 letters or numbers.';

export const normalizeTag = (value: string): string => value.trim().toLowerCase();

export const tagSuffixFromFull = (tag: string): string => (tag.startsWith('#') ? tag.slice(1) : tag);

export const toFullTag = (suffix: string): string => `#${suffix.trim().toLowerCase()}`;

export const tagSchema = z
	.string()
	.trim()
	.regex(TAG_PATTERN, TAG_FORMAT_ERROR)
	.transform(normalizeTag);

export const validateTag = (value: string): string | null => {
	const result = tagSchema.safeParse(value);
	if (result.success) {
		return null;
	}

	return result.error.issues[0]?.message ?? 'Invalid tag';
};
