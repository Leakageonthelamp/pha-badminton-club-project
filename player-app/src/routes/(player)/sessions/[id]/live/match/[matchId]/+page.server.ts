import {
	expirePendingMatches,
	loadMatchForPlayer,
	submitMatchScore
} from '$lib/server/matches';
import { loadLiveSessionForPlayer } from '$lib/server/sessions';
import { shouldViewSessionLivePage } from '$lib/sessions/navigation';
import type { MatchGameInput } from '$lib/types/match';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const readMatchGames = (formData: FormData): MatchGameInput[] | null => {
	const raw = formData.get('games_json');
	if (typeof raw !== 'string' || !raw) return null;

	try {
		const parsed = JSON.parse(raw) as MatchGameInput[];
		return Array.isArray(parsed) ? parsed : null;
	} catch {
		return null;
	}
};

export const load: PageServerLoad = async ({ params, depends, locals: { supabase, user } }) => {
	depends('app:player-match-live');

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

	const match = await loadMatchForPlayer(supabase, params.matchId, user.id);
	if (!match || match.session_id !== params.id) {
		error(404, 'Match not found');
	}

	if (!['active', 'score_pending', 'suspended'].includes(match.status)) {
		redirect(303, `/sessions/${params.id}/live`);
	}

	return { session: live.session, match, userId: user.id };
};

export const actions = {
	submitScore: async ({ params, request, locals: { supabase, user } }) => {
		if (!user) {
			return fail(401, { message: 'Sign in required' });
		}

		const games = readMatchGames(await request.formData());
		if (!games?.length) {
			return fail(400, { message: 'Score is required' });
		}

		const result = await submitMatchScore(supabase, params.matchId, games);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: 'Score submitted for confirmation.' };
	}
} satisfies Actions;
