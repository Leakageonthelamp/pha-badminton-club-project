import { z } from 'zod';

export const clubInputSchema = z.object({
	name: z.string().trim().min(1, 'Club name is required').max(100),
	description: z.string().trim().max(1000).default(''),
	max_active_sessions: z.coerce
		.number({ invalid_type_error: 'Max sessions must be a number' })
		.int('Max sessions must be a whole number')
		.min(1, 'Max sessions must be at least 1')
		.max(100, 'Max sessions cannot exceed 100')
});

export type ClubInput = z.infer<typeof clubInputSchema>;
