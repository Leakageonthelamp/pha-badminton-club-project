import { createSupabaseAdminClient } from '$lib/supabase/server';
import { ensureOAuthSignInMethod } from '$lib/server/profileCredentials';
import { ensureOAuthProfileAvatar } from '$lib/server/oauthProfile';
import { ensureProfileTag } from '$lib/server/tag';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const code = url.searchParams.get('code');

	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			const {
				data: { user }
			} = await supabase.auth.getUser();

			if (user) {
				const admin = createSupabaseAdminClient();
				await ensureProfileTag(admin, user.id);
				await ensureOAuthProfileAvatar(admin, user);
				await ensureOAuthSignInMethod(admin, user);
			}

			redirect(303, '/');
		}
	}

	redirect(303, '/login?error=Social login failed. Please try again.');
};
