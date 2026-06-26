import { authErrorMessage } from '$lib/types/auth';
import { parseLoginInput, resolveLoginEmail } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { Provider } from '@supabase/supabase-js';

export const load: PageServerLoad = async ({ url }) => {
	return {
		error: url.searchParams.get('error')
	};
};

export const actions: Actions = {
	login: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const parsed = parseLoginInput({
			identifier: String(formData.get('identifier') ?? ''),
			password: String(formData.get('password') ?? '')
		});

		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.flatten().fieldErrors,
				values: {
					identifier: String(formData.get('identifier') ?? '')
				}
			});
		}

		const authEmail = await resolveLoginEmail(parsed.data.identifier);
		if (!authEmail) {
			return fail(400, {
				message: authErrorMessage('account_not_found'),
				values: parsed.data
			});
		}

		const { error } = await supabase.auth.signInWithPassword({
			email: authEmail,
			password: parsed.data.password
		});

		if (error) {
			return fail(400, {
				message: authErrorMessage('invalid_credentials'),
				values: { identifier: parsed.data.identifier }
			});
		}

		redirect(303, '/');
	},

	oauth: async ({ request, locals: { supabase }, url }) => {
		const formData = await request.formData();
		const provider = String(formData.get('provider') ?? '') as Provider;

		if (provider !== 'google' && provider !== 'facebook') {
			return fail(400, { message: authErrorMessage('oauth_failed') });
		}

		await supabase.auth.signOut();

		const { data, error } = await supabase.auth.signInWithOAuth({
			provider,
			options: {
				redirectTo: `${url.origin}/auth/callback`
			}
		});

		if (error || !data.url) {
			return fail(400, { message: authErrorMessage('oauth_failed') });
		}

		redirect(303, data.url);
	}
};
