import { loadUpcomingSessionsForPlayer } from '$lib/server/sessions';
import { sessionMembershipActions } from '$lib/server/sessionMembershipActions';
import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, user }, depends }) => {
	depends('app:sessions');

	if (!user) {
		error(401, 'Sign in required');
	}

	const sessions = await loadUpcomingSessionsForPlayer(supabase, user.id);

	return { sessions };
};

export const actions = sessionMembershipActions satisfies Actions;
