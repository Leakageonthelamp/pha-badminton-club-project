import { authErrorMessage } from '$lib/types/auth';
import { parseRegisterInput, registerUser } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	register: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const parsed = parseRegisterInput({
			displayName: String(formData.get('displayName') ?? ''),
			identifier: String(formData.get('identifier') ?? ''),
			password: String(formData.get('password') ?? ''),
			confirmPassword: String(formData.get('confirmPassword') ?? '')
		});

		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.flatten().fieldErrors,
				values: {
					displayName: String(formData.get('displayName') ?? ''),
					identifier: String(formData.get('identifier') ?? '')
				}
			});
		}

		const result = await registerUser(parsed.data);
		if (!result.ok) {
			return fail(400, {
				message: authErrorMessage(result.code),
				values: {
					displayName: parsed.data.displayName,
					identifier: parsed.data.identifier
				}
			});
		}

		const { error } = await supabase.auth.signInWithPassword({
			email: result.authEmail,
			password: parsed.data.password
		});

		if (error) {
			return fail(400, {
				message: authErrorMessage('register_failed'),
				values: {
					displayName: parsed.data.displayName,
					identifier: parsed.data.identifier
				}
			});
		}

		redirect(303, '/profile');
	}
};
