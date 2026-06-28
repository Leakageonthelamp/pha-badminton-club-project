import { loadClubDetail } from '$lib/server/clubDetail';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals: { supabase, session, user } }) => {
	if (!session || !user) {
		error(401, 'Unauthorized');
	}

	const detail = await loadClubDetail(supabase, params.id, user.id);

	if (!detail) {
		error(404, 'Club not found');
	}

	return json(detail);
};
