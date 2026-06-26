import { CLUB_DESCRIPTION_MAX_LENGTH, CLUB_NAME_MAX_LENGTH } from '$lib/config/club';
import { z } from 'zod';

const booleanField = z.preprocess(
	(val) => val === true || val === 'true' || val === 'on',
	z.boolean()
);

const thaiPhoneRegex = /^0[689]\d{8}$/;
const nationalIdRegex = /^\d{13}$/;

export const SHUTTLE_NAME_MAX_LENGTH = 120;

export const shuttleInputSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'Shuttle name is required')
		.max(SHUTTLE_NAME_MAX_LENGTH, `Name must be ${SHUTTLE_NAME_MAX_LENGTH} characters or fewer`),
	speed: z.coerce
		.number({ invalid_type_error: 'Speed must be 75 or 76' })
		.refine((value) => value === 75 || value === 76, 'Speed must be 75 or 76'),
	original_price: z.coerce
		.number({ invalid_type_error: 'Original price must be a number' })
		.min(0, 'Original price cannot be negative'),
	price: z.coerce
		.number({ invalid_type_error: 'Price must be a number' })
		.min(0, 'Price cannot be negative'),
	number_per_box: z.coerce
		.number({ invalid_type_error: 'Number per box must be a number' })
		.int('Number per box must be a whole number')
		.min(1, 'Number per box must be at least 1')
});

export const shuttleUpdateSchema = shuttleInputSchema.extend({
	shuttleId: z.string().uuid('Invalid shuttle')
});

export const shuttleDeleteSchema = z.object({
	shuttleId: z.string().uuid('Invalid shuttle')
});

export const promptPayInputSchema = z
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
				message: 'Select PromptPay type',
				path: ['promptpay_type']
			});
			return;
		}

		if (!data.promptpay_target) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'PromptPay target is required',
				path: ['promptpay_target']
			});
			return;
		}

		if (data.promptpay_type === 'phone' && !thaiPhoneRegex.test(data.promptpay_target)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Enter a valid 10-digit Thai mobile number (e.g. 0812345678)',
				path: ['promptpay_target']
			});
		}

		if (data.promptpay_type === 'national_id' && !nationalIdRegex.test(data.promptpay_target)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Enter a valid 13-digit national ID',
				path: ['promptpay_target']
			});
		}
	});

export const locationInputSchema = z
	.object({
		clear: booleanField.optional().default(false),
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
				message: 'Set a location pin on the map',
				path: ['latitude']
			});
		}
	});

export const clubAdminClubInputSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'Club name is required')
		.max(CLUB_NAME_MAX_LENGTH, `Club name must be ${CLUB_NAME_MAX_LENGTH} characters or fewer`),
	description: z
		.string()
		.trim()
		.max(
			CLUB_DESCRIPTION_MAX_LENGTH,
			`Description must be ${CLUB_DESCRIPTION_MAX_LENGTH} characters or fewer`
		)
		.default('')
});
