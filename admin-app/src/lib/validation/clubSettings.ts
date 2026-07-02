import { CLUB_DESCRIPTION_MAX_LENGTH, CLUB_NAME_MAX_LENGTH } from '$lib/config/club';
import type { Locale } from '$lib/i18n';
import { tForLocale } from '$lib/i18n';
import { richTextPlainTextLength } from '@repo/ui/richText';
import { DEFAULT_LOCALE } from '@repo/ui/i18n';
import { z } from 'zod';

const booleanField = z.preprocess(
	(val) => val === true || val === 'true' || val === 'on',
	z.boolean()
);

const thaiPhoneRegex = /^0[689]\d{8}$/;
const nationalIdRegex = /^\d{13}$/;

export const SHUTTLE_NAME_MAX_LENGTH = 120;
export const VENUE_NAME_MAX_LENGTH = 120;

export const SHUTTLE_SPEEDS = [75, 76] as const;

export const buildShuttleInputSchema = (locale: Locale = DEFAULT_LOCALE) =>
	z.object({
		name: z
			.string()
			.trim()
			.min(1, tForLocale(locale, 'validation.shuttle.nameRequired'))
			.max(
				SHUTTLE_NAME_MAX_LENGTH,
				tForLocale(locale, 'validation.shuttle.nameMax', { max: SHUTTLE_NAME_MAX_LENGTH })
			),
		speed: z.coerce
			.number({ invalid_type_error: tForLocale(locale, 'validation.shuttle.speedNumber') })
			.int(tForLocale(locale, 'validation.shuttle.speedInt'))
			.refine(
				(value) => value === 75 || value === 76,
				tForLocale(locale, 'validation.shuttle.speedValues')
			),
		price: z.coerce
			.number({ invalid_type_error: tForLocale(locale, 'validation.shuttle.priceNumber') })
			.min(0, tForLocale(locale, 'validation.shuttle.priceMin')),
		number_per_box: z.coerce
			.number({ invalid_type_error: tForLocale(locale, 'validation.shuttle.perBoxNumber') })
			.int(tForLocale(locale, 'validation.shuttle.perBoxInt'))
			.min(1, tForLocale(locale, 'validation.shuttle.perBoxMin'))
	});

export const shuttleInputSchema = buildShuttleInputSchema();

export const buildShuttleUpdateSchema = (locale: Locale = DEFAULT_LOCALE) =>
	buildShuttleInputSchema(locale).extend({
		shuttleId: z.string().uuid(tForLocale(locale, 'validation.shuttle.invalid'))
	});

export const shuttleUpdateSchema = buildShuttleUpdateSchema();

export const buildShuttleDeleteSchema = (locale: Locale = DEFAULT_LOCALE) =>
	z.object({
		shuttleId: z.string().uuid(tForLocale(locale, 'validation.shuttle.invalid'))
	});

export const shuttleDeleteSchema = buildShuttleDeleteSchema();

const refinePromptPayTarget = (
	data: { promptpay_type: 'phone' | 'national_id'; promptpay_target: string },
	ctx: z.RefinementCtx,
	locale: Locale
) => {
	if (data.promptpay_type === 'phone' && !thaiPhoneRegex.test(data.promptpay_target)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: tForLocale(locale, 'validation.promptPay.phone'),
			path: ['promptpay_target']
		});
	}

	if (data.promptpay_type === 'national_id' && !nationalIdRegex.test(data.promptpay_target)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: tForLocale(locale, 'validation.promptPay.nationalId'),
			path: ['promptpay_target']
		});
	}
};

export const buildRequiredPromptPayFieldsSchema = (locale: Locale = DEFAULT_LOCALE) =>
	z
		.object({
			promptpay_type: z.enum(['phone', 'national_id'], {
				errorMap: () => ({ message: tForLocale(locale, 'validation.session.promptPayType') })
			}),
			promptpay_target: z
				.string()
				.trim()
				.min(1, tForLocale(locale, 'validation.session.promptPayTarget'))
		})
		.superRefine((data, ctx) => refinePromptPayTarget(data, ctx, locale));

export const requiredPromptPayFieldsSchema = buildRequiredPromptPayFieldsSchema();

export const buildPromptPayInputSchema = (locale: Locale = DEFAULT_LOCALE) =>
	z
		.object({
			clear: booleanField.optional().default(false),
			promptpay_type: z.enum(['phone', 'national_id']).optional(),
			promptpay_target: z.string().trim()
		})
		.superRefine((data, ctx) => {
			if (data.clear) {
				return;
			}

			if (!data.promptpay_type) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: tForLocale(locale, 'validation.session.promptPayType'),
					path: ['promptpay_type']
				});
				return;
			}

			if (!data.promptpay_target) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: tForLocale(locale, 'validation.session.promptPayTarget'),
					path: ['promptpay_target']
				});
				return;
			}

			refinePromptPayTarget(
				{ promptpay_type: data.promptpay_type, promptpay_target: data.promptpay_target },
				ctx,
				locale
			);
		});

export const promptPayInputSchema = buildPromptPayInputSchema();

export const buildLocationInputSchema = (locale: Locale = DEFAULT_LOCALE) =>
	z
		.object({
			clear: booleanField.optional().default(false),
			venue_name: z
				.string()
				.trim()
				.max(
					VENUE_NAME_MAX_LENGTH,
					tForLocale(locale, 'validation.location.venueMax', { max: VENUE_NAME_MAX_LENGTH })
				)
				.optional()
				.transform((value) => value || null),
			latitude: z.preprocess(
				(val) => (val === '' || val === null || val === undefined ? null : val),
				z.coerce.number().min(-90).max(90).nullable()
			),
			longitude: z.preprocess(
				(val) => (val === '' || val === null || val === undefined ? null : val),
				z.coerce.number().min(-180).max(180).nullable()
			)
		})
		.superRefine((data, ctx) => {
			if (data.clear) {
				return;
			}

			const hasLat = data.latitude !== null;
			const hasLng = data.longitude !== null;

			if (hasLat !== hasLng) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: tForLocale(locale, 'validation.location.pin'),
					path: ['latitude']
				});
			}

			if ((hasLat || hasLng) && !data.venue_name) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: tForLocale(locale, 'validation.location.venueRequired'),
					path: ['venue_name']
				});
			}
		});

export const locationInputSchema = buildLocationInputSchema();

export const buildClubAdminClubInputSchema = (locale: Locale = DEFAULT_LOCALE) =>
	z.object({
		name: z
			.string()
			.trim()
			.min(1, tForLocale(locale, 'validation.club.nameRequired'))
			.max(
				CLUB_NAME_MAX_LENGTH,
				tForLocale(locale, 'validation.club.nameMax', { max: CLUB_NAME_MAX_LENGTH })
			),
		description: z
			.string()
			.trim()
			.default('')
			.refine(
				(val) => richTextPlainTextLength(val) <= CLUB_DESCRIPTION_MAX_LENGTH,
				tForLocale(locale, 'validation.club.descriptionMax', { max: CLUB_DESCRIPTION_MAX_LENGTH })
			)
	});

export const clubAdminClubInputSchema = buildClubAdminClubInputSchema();
