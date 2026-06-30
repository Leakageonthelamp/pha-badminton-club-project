import { ensureSupabaseAuth } from '$lib/server/supabaseAuth';
import { createSupabaseAdminClient } from '$lib/supabase/server';
import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase, user } }) => {
	if (!user) {
		error(401, 'Sign in required');
	}

	await ensureSupabaseAuth(supabase);

	const path = url.searchParams.get('path');
	if (!path || !path.startsWith(`${user.id}/`) || path.includes('..')) {
		error(403, 'Forbidden');
	}

	const admin = createSupabaseAdminClient();
	const { data, error: signError } = await admin.storage
		.from('payment-slips')
		.createSignedUrl(path, 300);

	if (signError || !data?.signedUrl) {
		error(404, 'Slip not found');
	}

	redirect(302, data.signedUrl);
};
