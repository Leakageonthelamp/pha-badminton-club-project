import { loadSessionDetailForPlayer } from '$lib/server/sessions';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals: { supabase, session, user } }) => {
	if (!session || !user) {
		error(401, 'Unauthorized');
	}

	const detail = await loadSessionDetailForPlayer(supabase, params.id, user.id);

	if (!detail) {
		error(404, 'Session not found');
	}

	return json(detail);
};
