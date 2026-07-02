import type { Locale } from '$lib/i18n';
import { tForLocale } from '$lib/i18n';
import { DEFAULT_LOCALE } from '@repo/ui/i18n';
import { z } from 'zod';

/** # + exactly 4 ASCII letters or digits */
export const TAG_PATTERN = /^#[a-zA-Z0-9]{4}$/;

export const normalizeTag = (value: string): string => value.trim().toLowerCase();

export const tagSuffixFromFull = (tag: string): string => (tag.startsWith('#') ? tag.slice(1) : tag);

export const toFullTag = (suffix: string): string => `#${suffix.trim().toLowerCase()}`;

export const buildTagSchema = (locale: Locale = DEFAULT_LOCALE) =>
	z
		.string()
		.trim()
		.regex(TAG_PATTERN, tForLocale(locale, 'validation.tag.format'))
		.transform(normalizeTag);

export const tagSchema = buildTagSchema();

export const validateTag = (value: string, locale: Locale = DEFAULT_LOCALE): string | null => {
	const result = buildTagSchema(locale).safeParse(value);
	if (result.success) {
		return null;
	}

	return result.error.issues[0]?.message ?? tForLocale(locale, 'validation.tag.invalid');
};
