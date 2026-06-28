import { CLUB_DESCRIPTION_MAX_LENGTH, CLUB_NAME_MAX_LENGTH } from '$lib/config/club';
import { richTextPlainTextLength } from '@repo/ui/richText';
import { CLUB_MAX_ACTIVE_SESSIONS_LIMIT, CLUB_MAX_ADMINS_LIMIT } from '$lib/server/clubLimits';
import { z } from 'zod';

const booleanField = z.preprocess(
	(val) => val === true || val === 'true' || val === 'on',
	z.boolean()
);

const descriptionField = z
	.string()
	.trim()
	.default('')
	.refine(
		(val) => richTextPlainTextLength(val) <= CLUB_DESCRIPTION_MAX_LENGTH,
		`Description must be ${CLUB_DESCRIPTION_MAX_LENGTH} characters or fewer`
	);

export const clubInputSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'Club name is required')
		.max(CLUB_NAME_MAX_LENGTH, `Club name must be ${CLUB_NAME_MAX_LENGTH} characters or fewer`),
	description: descriptionField,
	max_active_sessions: z.coerce
		.number({ invalid_type_error: 'Max sessions must be a number' })
		.int('Max sessions must be a whole number')
		.min(1, 'Max sessions must be at least 1')
		.max(
			CLUB_MAX_ACTIVE_SESSIONS_LIMIT,
			`Max sessions cannot exceed ${CLUB_MAX_ACTIVE_SESSIONS_LIMIT}`
		),
	max_admins: z.coerce
		.number({ invalid_type_error: 'Max admins must be a number' })
		.int('Max admins must be a whole number')
		.min(1, 'Max admins must be at least 1')
		.max(CLUB_MAX_ADMINS_LIMIT, `Max admins cannot exceed ${CLUB_MAX_ADMINS_LIMIT}`),
	is_active: booleanField
});

export type ClubInput = z.infer<typeof clubInputSchema>;
