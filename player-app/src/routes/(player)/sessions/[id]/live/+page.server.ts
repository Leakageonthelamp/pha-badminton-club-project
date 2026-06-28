import {
	cancelSessionLeave,
	loadLiveSessionForPlayer,
	requestSessionLeave,
	setSessionBreak,
	submitPayment
} from '$lib/server/sessions';
import { shouldViewSessionLivePage } from '$lib/sessions/navigation';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, depends, locals: { supabase, user } }) => {
	depends('app:live-session');

	if (!user) {
		error(401, 'Sign in required');
	}

	const live = await loadLiveSessionForPlayer(supabase, params.id, user.id);

	if (!live) {
		error(404, 'Session not found');
	}

	if (
		!shouldViewSessionLivePage({
			status: live.session.status,
			my_membership: live.session.my_membership
		})
	) {
		redirect(303, '/sessions');
	}

	return live;
};

export const actions = {
	requestLeave: async ({ params, locals: { supabase, user } }) => {
		if (!user) {
			return fail(401, { message: 'Sign in required' });
		}

		const result = await requestSessionLeave(supabase, params.id);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: 'Leave request sent to admin.' };
	},

	cancelLeave: async ({ params, locals: { supabase, user } }) => {
		if (!user) {
			return fail(401, { message: 'Sign in required' });
		}

		const result = await cancelSessionLeave(supabase, params.id);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: 'Leave request cancelled.' };
	},

	submitPayment: async ({ params, locals: { supabase, user } }) => {
		if (!user) {
			return fail(401, { message: 'Sign in required' });
		}

		const result = await submitPayment(supabase, params.id);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: 'Payment submitted. Waiting for admin confirmation.' };
	},

	toggleBreak: async ({ params, request, locals: { supabase, user } }) => {
		if (!user) {
			return fail(401, { message: 'Sign in required' });
		}

		const formData = await request.formData();
		const onBreak = formData.get('on_break') === 'true';

		const result = await setSessionBreak(supabase, params.id, onBreak);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return {
			success: true,
			message: onBreak ? 'You are on break.' : 'Welcome back — you are idle again.'
		};
	}
} satisfies Actions;
