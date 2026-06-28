import { loadUpcomingSessionsForPlayer } from '$lib/server/sessions';
import type { ClubPublic } from '$lib/types/club';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, user }, depends }) => {
	depends('app:clubs');
	depends('app:sessions');

	if (!user) {
		error(401, 'Sign in required');
	}

	const [clubsResult, sessions] = await Promise.all([
		supabase
			.from('clubs')
			.select('id, name, description, venue_name, latitude, longitude')
			.eq('is_active', true)
			.order('name', { ascending: true }),
		loadUpcomingSessionsForPlayer(supabase, user.id)
	]);

	if (clubsResult.error) {
		console.error('Failed to load clubs', clubsResult.error);
	}

	return {
		clubs: (clubsResult.data ?? []) as ClubPublic[],
		sessions
	};
};
