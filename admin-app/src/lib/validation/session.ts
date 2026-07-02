import {
	SESSION_DESCRIPTION_MAX_LENGTH,
	SESSION_MIN_START_LEAD_MINUTES,
	SESSION_NAME_MAX_LENGTH
} from '$lib/config/session';
import type { Locale } from '$lib/i18n';
import { tForLocale } from '$lib/i18n';
import { buildRequiredPromptPayFieldsSchema } from '$lib/validation/clubSettings';
import { DEFAULT_LOCALE } from '@repo/ui/i18n';
import { z } from 'zod';

const coordinateField = z.preprocess(
	(val) => (val === '' || val === null || val === undefined ? null : val),
	z.coerce.number().nullable()
);

export const buildSessionInputSchema = (
	locale: Locale = DEFAULT_LOCALE,
	minStartLeadMinutes = SESSION_MIN_START_LEAD_MINUTES
) => {
	const tr = (key: string, params?: Record<string, string | number>) =>
		tForLocale(locale, key, params);

	return z
		.object({
			club_id: z.string().uuid(tr('validation.session.selectClub')),
			name: z
				.string()
				.trim()
				.min(1, tr('validation.session.nameRequired'))
				.max(
					SESSION_NAME_MAX_LENGTH,
					tr('validation.session.nameMax', { max: SESSION_NAME_MAX_LENGTH })
				),
			description: z
				.string()
				.max(
					SESSION_DESCRIPTION_MAX_LENGTH,
					tr('validation.session.descriptionMax', { max: SESSION_DESCRIPTION_MAX_LENGTH })
				)
				.default(''),
			start_at: z
				.string()
				.min(1, tr('validation.session.startRequired'))
				.datetime({ message: tr('validation.session.startInvalid') }),
			end_at: z
				.string()
				.min(1, tr('validation.session.endRequired'))
				.datetime({ message: tr('validation.session.endInvalid') }),
			venue_name: z.preprocess(
				(val) => (val === null || val === undefined ? '' : val),
				z
					.string()
					.trim()
					.min(1, tr('validation.session.venueRequired'))
					.max(120, tr('validation.session.venueMax', { max: 120 }))
			),
			latitude: coordinateField.refine(
				(value) => value === null || (value >= -90 && value <= 90),
				tr('validation.session.latitude')
			),
			longitude: coordinateField.refine(
				(value) => value === null || (value >= -180 && value <= 180),
				tr('validation.session.longitude')
			),
			max_players: z.coerce
				.number({ invalid_type_error: tr('validation.session.maxPlayersNumber') })
				.int(tr('validation.session.maxPlayersInt'))
				.min(1, tr('validation.session.maxPlayersMin')),
			min_players: z.coerce
				.number({ invalid_type_error: tr('validation.session.minPlayersNumber') })
				.int(tr('validation.session.minPlayersInt'))
				.min(1, tr('validation.session.minPlayersMin')),
			court_count: z.coerce
				.number({ invalid_type_error: tr('validation.session.courtCountNumber') })
				.int(tr('validation.session.courtCountInt'))
				.min(1, tr('validation.session.courtCountMin')),
			court_fee_per_hour: z.coerce
				.number({ invalid_type_error: tr('validation.session.courtFeeNumber') })
				.min(0, tr('validation.session.courtFeeMin')),
			fixed_court_fee_per_player: z.preprocess(
				(val) => (val === '' || val === null || val === undefined ? null : val),
				z.coerce
					.number({ invalid_type_error: tr('validation.session.fixedFeeNumber') })
					.min(0, tr('validation.session.fixedFeeMin'))
					.nullable()
			),
			shuttle_id: z.string().uuid(tr('validation.session.selectShuttle')),
			shuttle_price_per_each: z.coerce
				.number({ invalid_type_error: tr('validation.session.shuttlePriceNumber') })
				.min(0, tr('validation.session.shuttlePriceMin')),
			match_score_type: z.coerce
				.number({ invalid_type_error: tr('validation.session.scoreType') })
				.refine(
					(value) => value === 15 || value === 21,
					tr('validation.session.scoreTypeValues')
				),
			match_type: z.enum(['one_round', 'two_round'], {
				errorMap: () => ({ message: tr('validation.session.matchType') })
			}),
			cancellation_fee: z.coerce
				.number({ invalid_type_error: tr('validation.session.cancelFeeNumber') })
				.min(0, tr('validation.session.cancelFeeMin')),
			max_buffer: z.coerce
				.number({ invalid_type_error: tr('validation.session.bufferNumber') })
				.int(tr('validation.session.bufferInt'))
				.min(0, tr('validation.session.bufferMin')),
			promptpay_type: z.enum(['phone', 'national_id'], {
				errorMap: () => ({ message: tr('validation.session.promptPayType') })
			}),
			promptpay_target: z.string().trim().min(1, tr('validation.session.promptPayTarget'))
		})
		.superRefine((data, ctx) => {
			const promptPay = buildRequiredPromptPayFieldsSchema(locale).safeParse({
				promptpay_type: data.promptpay_type,
				promptpay_target: data.promptpay_target
			});
			if (!promptPay.success) {
				for (const issue of promptPay.error.issues) {
					ctx.addIssue(issue);
				}
			}
			if (data.min_players > data.max_players) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: tr('validation.session.minExceedsMax'),
					path: ['min_players']
				});
			}

			const hasLat = data.latitude !== null;
			const hasLng = data.longitude !== null;
			if (hasLat !== hasLng) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: tr('validation.session.venuePin'),
					path: ['latitude']
				});
			}

			const startAt = new Date(data.start_at);
			const endAt = new Date(data.end_at);

			if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: tr('validation.session.invalidDateTime'),
					path: ['start_at']
				});
				return;
			}

			if (endAt <= startAt) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: tr('validation.session.endAfterStart'),
					path: ['end_at']
				});
				return;
			}

			const oneHourMs = 60 * 60 * 1000;
			if (endAt.getTime() - startAt.getTime() < oneHourMs) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: tr('validation.session.minDuration'),
					path: ['end_at']
				});
			}

			if (startAt.getTime() < Date.now()) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: tr('validation.session.startPast'),
					path: ['start_at']
				});
			}

			if (minStartLeadMinutes > 0) {
				const minStartMs = Date.now() + minStartLeadMinutes * 60 * 1000;
				if (startAt.getTime() < minStartMs) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: tr('validation.session.startLead', { minutes: minStartLeadMinutes }),
						path: ['start_at']
					});
				}
			}
		});
};

export const sessionInputSchema = buildSessionInputSchema();

export type SessionInput = z.infer<ReturnType<typeof buildSessionInputSchema>>;
