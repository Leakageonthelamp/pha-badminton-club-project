import {
	cancelSessionMembership,
	joinSession,
	leaveSession,
	submitCancellationFee
} from '$lib/server/sessions';
import { fail, type Actions } from '@sveltejs/kit';

export const sessionMembershipActions = {
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
			result.status === 'queued' ? 'Added to buffer queue.' : 'Joined waiting list.';

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

		return {
			success: true,
			message,
			sessionId,
			feeOwed: result.feeOwed,
			playerId: result.playerId,
			feeStatus: result.feeStatus
		};
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
	},

	submitFee: async ({ request, locals: { supabase, user } }) => {
		if (!user) {
			return fail(401, { message: 'Sign in required' });
		}

		const playerId = (await request.formData()).get('player_id');
		if (typeof playerId !== 'string' || !playerId) {
			return fail(400, { message: 'Fee record is required' });
		}

		const result = await submitCancellationFee(supabase, playerId);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return {
			success: true,
			message: 'Payment submitted. Waiting for admin confirmation.',
			playerId
		};
	}
} satisfies Actions;
