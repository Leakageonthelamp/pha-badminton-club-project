import { clubInputSchema } from '$lib/validation/club';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals: { supabase, user } }) => {
		if (!user) {
			return fail(401, { message: 'Sign in required' });
		}

		const formData = await request.formData();
		const parsed = clubInputSchema.safeParse({
			name: formData.get('name'),
			description: formData.get('description') ?? '',
			max_active_sessions: formData.get('max_active_sessions')
		});

		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				message: Object.values(fieldErrors).flat()[0] ?? 'Invalid input',
				error: fieldErrors,
				values: {
					name: String(formData.get('name') ?? ''),
					description: String(formData.get('description') ?? ''),
					max_active_sessions: String(formData.get('max_active_sessions') ?? '')
				}
			});
		}

		const { data, error } = await supabase
			.from('clubs')
			.insert({
				name: parsed.data.name,
				description: parsed.data.description,
				max_active_sessions: parsed.data.max_active_sessions,
				owner_id: user.id
			})
			.select('id')
			.single();

		if (error || !data) {
			console.error('Failed to create club', error);
			return fail(500, {
				message: 'Could not create club. Please try again.',
				values: parsed.data
			});
		}

		redirect(303, `/clubs/${data.id}?created=1`);
	}
};
