import { loadManagedClubs } from '$lib/server/clubAccess';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url, locals: { supabase, user, appRole } }) => {
	if (!user || !appRole) {
		return { clubs: [] };
	}

	if (appRole === 'club_admin' && url.pathname === '/') {
		redirect(303, '/dashboard');
	}

	if (appRole !== 'super_admin') {
		return { clubs: [] };
	}

	const clubs = await loadManagedClubs(supabase, user.id, appRole);

	return { clubs, appRole };
};
