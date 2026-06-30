import {
	expirePendingMatches,
	loadMyMatchHistory,
	loadMyOpenMatch,
	loadMyInviteMatch,
	loadSessionMatches,
	respondMatchInvite,
	respondMatchScore,
	toCourtGridMatches
} from '$lib/server/matches';
import {
	cancelSessionLeave,
	loadLiveSessionForPlayer,
	requestSessionLeave,
	setSessionBreak,
	submitPayment
} from '$lib/server/sessions';
import { readSlipFromForm, uploadSlip } from '$lib/server/slips';
import { ensureSupabaseAuth } from '$lib/server/supabaseAuth';
import { shouldViewSessionLivePage } from '$lib/sessions/navigation';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, depends, locals: { supabase, user } }) => {
	depends('app:live-session');

	if (!user) {
		error(401, 'Sign in required');
	}

	await expirePendingMatches(supabase, params.id);

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

	const [sessionMatches, myInviteMatch, myOpenMatch, myMatchHistory] = await Promise.all([
		loadSessionMatches(supabase, params.id),
		loadMyInviteMatch(supabase, params.id, user.id),
		loadMyOpenMatch(supabase, params.id, user.id),
		loadMyMatchHistory(supabase, params.id, user.id)
	]);

	return {
		...live,
		userId: user.id,
		sessionMatches,
		courtGridMatches: toCourtGridMatches(sessionMatches),
		myInviteMatch,
		myOpenMatch,
		myMatchHistory
	};
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

	submitPayment: async ({ params, request, locals: { supabase, user } }) => {
		if (!user) {
			return fail(401, { message: 'Sign in required' });
		}

		const formData = await request.formData();
		const slipInput = readSlipFromForm(formData);
		if (!slipInput.ok) {
			return fail(400, { message: slipInput.message });
		}

		const upload = await uploadSlip(user.id, 'session_payment', params.id, slipInput.file);
		if (!upload.ok) {
			return fail(400, { message: upload.message });
		}

		if (!(await ensureSupabaseAuth(supabase))) {
			return fail(401, { message: 'Sign in required' });
		}

		const result = await submitPayment(supabase, params.id, upload.path);
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
	},

	respondInvite: async ({ request, locals: { supabase, user } }) => {
		if (!user) {
			return fail(401, { message: 'Sign in required' });
		}

		const formData = await request.formData();
		const matchId = formData.get('match_id');
		const accept = formData.get('accept') === 'true';

		if (typeof matchId !== 'string' || !matchId) {
			return fail(400, { message: 'Match is required' });
		}

		const result = await respondMatchInvite(supabase, matchId, accept);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return {
			success: true,
			message: accept ? 'Match accepted.' : 'Match declined.'
		};
	},

	respondScore: async ({ request, locals: { supabase, user } }) => {
		if (!user) {
			return fail(401, { message: 'Sign in required' });
		}

		const formData = await request.formData();
		const matchId = formData.get('match_id');
		const accept = formData.get('accept') === 'true';

		if (typeof matchId !== 'string' || !matchId) {
			return fail(400, { message: 'Match is required' });
		}

		const result = await respondMatchScore(supabase, matchId, accept);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return {
			success: true,
			message: accept ? 'Score accepted.' : 'Score rejected — admin will review.'
		};
	}
} satisfies Actions;
