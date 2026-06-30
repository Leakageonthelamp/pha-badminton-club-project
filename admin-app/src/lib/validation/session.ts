import {
	SESSION_DESCRIPTION_MAX_LENGTH,
	SESSION_MIN_START_LEAD_MINUTES,
	SESSION_NAME_MAX_LENGTH
} from '$lib/config/session';
import { requiredPromptPayFieldsSchema } from '$lib/validation/clubSettings';
import { z } from 'zod';

const coordinateField = z.preprocess(
	(val) => (val === '' || val === null || val === undefined ? null : val),
	z.coerce.number().nullable()
);

export const buildSessionInputSchema = (
	minStartLeadMinutes = SESSION_MIN_START_LEAD_MINUTES
) =>
	z
		.object({
			club_id: z.string().uuid('Select a club'),
			name: z
				.string()
				.trim()
				.min(1, 'Session name is required')
				.max(
					SESSION_NAME_MAX_LENGTH,
					`Name must be ${SESSION_NAME_MAX_LENGTH} characters or fewer`
				),
			description: z
				.string()
				.max(
					SESSION_DESCRIPTION_MAX_LENGTH,
					`Description must be ${SESSION_DESCRIPTION_MAX_LENGTH} characters or fewer`
				)
				.default(''),
			start_at: z
				.string()
				.min(1, 'Start date and time are required')
				.datetime({ message: 'Invalid start date and time' }),
			end_at: z
				.string()
				.min(1, 'End date and time are required')
				.datetime({ message: 'Invalid end date and time' }),
			venue_name: z.preprocess(
				(val) => (val === null || val === undefined ? '' : val),
				z
					.string()
					.trim()
					.min(1, 'Venue name is required')
					.max(120, 'Venue name must be 120 characters or fewer')
			),
			latitude: coordinateField.refine(
				(value) => value === null || (value >= -90 && value <= 90),
				'Invalid latitude'
			),
			longitude: coordinateField.refine(
				(value) => value === null || (value >= -180 && value <= 180),
				'Invalid longitude'
			),
			max_players: z.coerce
				.number({ invalid_type_error: 'Max players must be a number' })
				.int('Max players must be a whole number')
				.min(1, 'Max players must be at least 1'),
			min_players: z.coerce
				.number({ invalid_type_error: 'Min players must be a number' })
				.int('Min players must be a whole number')
				.min(1, 'Min players must be at least 1'),
			court_count: z.coerce
				.number({ invalid_type_error: 'Court count must be a number' })
				.int('Court count must be a whole number')
				.min(1, 'Court count must be at least 1'),
			court_fee_per_hour: z.coerce
				.number({ invalid_type_error: 'Court fee must be a number' })
				.min(0, 'Court fee cannot be negative'),
			fixed_court_fee_per_player: z.preprocess(
				(val) => (val === '' || val === null || val === undefined ? null : val),
				z.coerce
					.number({ invalid_type_error: 'Fixed court fee must be a number' })
					.min(0, 'Fixed court fee cannot be negative')
					.nullable()
			),
			shuttle_id: z.string().uuid('Select a shuttle'),
			shuttle_price_per_each: z.coerce
				.number({ invalid_type_error: 'Shuttle price must be a number' })
				.min(0, 'Shuttle price cannot be negative'),
			match_score_type: z.coerce
				.number({ invalid_type_error: 'Select a score type' })
				.refine((value) => value === 15 || value === 21, 'Score type must be 15 or 21'),
			match_type: z.enum(['one_round', 'two_round'], {
				errorMap: () => ({ message: 'Select a match type' })
			}),
			cancellation_fee: z.coerce
				.number({ invalid_type_error: 'Cancellation fee must be a number' })
				.min(0, 'Cancellation fee cannot be negative'),
			max_buffer: z.coerce
				.number({ invalid_type_error: 'Buffer queue must be a number' })
				.int('Buffer queue must be a whole number')
				.min(0, 'Buffer queue cannot be negative'),
			promptpay_type: z.enum(['phone', 'national_id'], {
				errorMap: () => ({ message: 'Select PromptPay type' })
			}),
			promptpay_target: z.string().trim().min(1, 'PromptPay target is required')
		})
		.superRefine((data, ctx) => {
			const promptPay = requiredPromptPayFieldsSchema.safeParse({
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
					message: 'Min players cannot exceed max players',
					path: ['min_players']
				});
			}

			const hasLat = data.latitude !== null;
			const hasLng = data.longitude !== null;
			if (hasLat !== hasLng) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Set a venue pin on the map',
					path: ['latitude']
				});
			}

			const startAt = new Date(data.start_at);
			const endAt = new Date(data.end_at);

			if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid date and time',
					path: ['start_at']
				});
				return;
			}

			if (endAt <= startAt) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'End time must be after start time',
					path: ['end_at']
				});
				return;
			}

			const oneHourMs = 60 * 60 * 1000;
			if (endAt.getTime() - startAt.getTime() < oneHourMs) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Session must be at least 1 hour long',
					path: ['end_at']
				});
			}

			if (startAt.getTime() < Date.now()) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Start time cannot be in the past',
					path: ['start_at']
				});
			}

			if (minStartLeadMinutes > 0) {
				const minStartMs = Date.now() + minStartLeadMinutes * 60 * 1000;
				if (startAt.getTime() < minStartMs) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Start time must be at least ${minStartLeadMinutes} minutes from now`,
						path: ['start_at']
					});
				}
			}
		});

export const sessionInputSchema = buildSessionInputSchema();

export type SessionInput = z.infer<typeof sessionInputSchema>;
