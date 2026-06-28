import {
	cancelSessionMembership,
	joinSession,
	leaveSession,
	loadUpcomingSessionsForPlayer
} from '$lib/server/sessions';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, user }, depends }) => {
	depends('app:sessions');

	if (!user) {
		error(401, 'Sign in required');
	}

	const sessions = await loadUpcomingSessionsForPlayer(supabase, user.id);

	return { sessions };
};

export const actions: Actions = {
	join: async ({ request, locals: { supabase, user } }) => {
		if (!user) {
			return fail(401, { message: 'Sign in required' });
		}

		const sessionId = (await request.formData()).get('session_id');
		if (typeof sessionId !== 'string' || !sessionId) {
			return fail(400, { message: 'Session is required' });
		}

		const result = await joinSession(supabase, sessionId);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		const label =
			result.status === 'queued'
				? 'Added to buffer queue.'
				: 'Joined waiting list.';

		return { success: true, message: label, sessionId };
	},

	cancel: async ({ request, locals: { supabase, user } }) => {
		if (!user) {
			return fail(401, { message: 'Sign in required' });
		}

		const sessionId = (await request.formData()).get('session_id');
		if (typeof sessionId !== 'string' || !sessionId) {
			return fail(400, { message: 'Session is required' });
		}

		const result = await cancelSessionMembership(supabase, sessionId);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		const message =
			result.feeOwed > 0
				? `Membership cancelled. Cancellation fee of ${result.feeOwed.toFixed(2)} THB recorded.`
				: 'Membership cancelled.';

		return { success: true, message, sessionId };
	},

	leave: async ({ request, locals: { supabase, user } }) => {
		if (!user) {
			return fail(401, { message: 'Sign in required' });
		}

		const sessionId = (await request.formData()).get('session_id');
		if (typeof sessionId !== 'string' || !sessionId) {
			return fail(400, { message: 'Session is required' });
		}

		const result = await leaveSession(supabase, sessionId);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: 'Left session.', sessionId };
	}
};
