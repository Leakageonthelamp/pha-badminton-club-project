import { loadManagedClubs } from '$lib/server/clubAccess';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, user, appRole } }) => {
	if (!user || !appRole) {
		return { clubs: [], profileName: '' };
	}

	if (appRole !== 'club_admin') {
		redirect(303, '/');
	}

	const clubs = await loadManagedClubs(supabase, user.id, appRole);

	const { data: profile } = await supabase
		.from('profiles')
		.select('display_name')
		.eq('id', user.id)
		.single();

	return {
		clubs,
		profileName: profile?.display_name ?? 'Club admin'
	};
};
