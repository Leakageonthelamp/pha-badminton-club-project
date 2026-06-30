import { createSupabaseAdminClient } from '$lib/supabase/server';
import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const slipPathPattern = /^[\w-]+\/(session_payment|cancellation_fee)\/[\w-]+\.jpg$/;

export const GET: RequestHandler = async ({ url, locals: { user } }) => {
	if (!user) {
		error(401, 'Sign in required');
	}

	const path = url.searchParams.get('path');
	if (!path || path.includes('..') || !slipPathPattern.test(path)) {
		error(400, 'Invalid slip path');
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
