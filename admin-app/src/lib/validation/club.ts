import { CLUB_DESCRIPTION_MAX_LENGTH, CLUB_NAME_MAX_LENGTH } from '$lib/config/club';
import type { Locale } from '$lib/i18n';
import { tForLocale } from '$lib/i18n';
import { richTextPlainTextLength } from '@repo/ui/richText';
import { CLUB_MAX_ACTIVE_SESSIONS_LIMIT, CLUB_MAX_ADMINS_LIMIT } from '$lib/server/clubLimits';
import { DEFAULT_LOCALE } from '@repo/ui/i18n';
import { z } from 'zod';

const booleanField = z.preprocess(
	(val) => val === true || val === 'true' || val === 'on',
	z.boolean()
);

const buildDescriptionField = (locale: Locale) =>
	z
		.string()
		.trim()
		.default('')
		.refine(
			(val) => richTextPlainTextLength(val) <= CLUB_DESCRIPTION_MAX_LENGTH,
			tForLocale(locale, 'validation.club.descriptionMax', { max: CLUB_DESCRIPTION_MAX_LENGTH })
		);

export const buildClubInputSchema = (locale: Locale = DEFAULT_LOCALE) =>
	z.object({
		name: z
			.string()
			.trim()
			.min(1, tForLocale(locale, 'validation.club.nameRequired'))
			.max(
				CLUB_NAME_MAX_LENGTH,
				tForLocale(locale, 'validation.club.nameMax', { max: CLUB_NAME_MAX_LENGTH })
			),
		description: buildDescriptionField(locale),
		max_active_sessions: z.coerce
			.number({ invalid_type_error: tForLocale(locale, 'validation.club.maxSessionsNumber') })
			.int(tForLocale(locale, 'validation.club.maxSessionsInt'))
			.min(1, tForLocale(locale, 'validation.club.maxSessionsMin'))
			.max(
				CLUB_MAX_ACTIVE_SESSIONS_LIMIT,
				tForLocale(locale, 'validation.club.maxSessionsMax', { max: CLUB_MAX_ACTIVE_SESSIONS_LIMIT })
			),
		max_admins: z.coerce
			.number({ invalid_type_error: tForLocale(locale, 'validation.club.maxAdminsNumber') })
			.int(tForLocale(locale, 'validation.club.maxAdminsInt'))
			.min(1, tForLocale(locale, 'validation.club.maxAdminsMin'))
			.max(
				CLUB_MAX_ADMINS_LIMIT,
				tForLocale(locale, 'validation.club.maxAdminsMax', { max: CLUB_MAX_ADMINS_LIMIT })
			),
		is_active: booleanField
	});

export const clubInputSchema = buildClubInputSchema();

export type ClubInput = z.infer<ReturnType<typeof buildClubInputSchema>>;
