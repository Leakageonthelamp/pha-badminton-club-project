import { createSupabaseAdminClient } from '$lib/supabase/server';
import { verifyMasterKey } from '$lib/server/masterKey';
import { env } from '$env/dynamic/private';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

const bodySchema = z.object({
	userId: z.string().uuid()
});

export const POST: RequestHandler = async ({ request }) => {
	const rawKey = request.headers.get('x-master-key') ?? '';

	if (!verifyMasterKey(rawKey, env.MASTER_KEY_SHA256 ?? '')) {
		error(401, 'Unauthorized');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	const parsed = bodySchema.safeParse(body);
	if (!parsed.success) {
		error(400, 'Invalid request body');
	}

	const admin = createSupabaseAdminClient();

	const { data: profile, error: profileError } = await admin
		.from('profiles')
		.select('id')
		.eq('id', parsed.data.userId)
		.single();

	if (profileError || !profile) {
		error(404, 'User not found');
	}

	const { error: updateError } = await admin
		.from('profiles')
		.update({ app_role: 'super_admin' })
		.eq('id', parsed.data.userId);

	if (updateError) {
		console.error('Failed to promote super admin', updateError);
		error(500, 'Failed to promote user');
	}

	return json({ ok: true, userId: parsed.data.userId });
};
