import { tForLocale } from '$lib/i18n';
import { resolveEffectiveAppRole } from '$lib/server/adminDashboardMode';
import { assertCanManageClub } from '$lib/server/clubAccess';
import {
	addMatchShuttle,
	endMatchNoScore,
	endMatchWithScore,
	expirePendingMatches,
	loadMatchDetail,
	resolveMatchScore
} from '$lib/server/matches';
import { loadSessionDetail, sweepStartedSessions } from '$lib/server/sessions';
import type { MatchGameInput } from '$lib/types/match';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const readId = (formData: FormData, key: string): string | null => {
	const value = formData.get(key);
	return typeof value === 'string' && value ? value : null;
};

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

export const load: PageServerLoad = async ({
	params,
	cookies,
	depends,
	locals: { supabase, user, appRole, locale }
}) => {
	depends('app:session-match-control');

	if (!user || !appRole) {
		error(401, tForLocale(locale, 'auth.error.signInRequired'));
	}

	await sweepStartedSessions(supabase);

	const session = await loadSessionDetail(supabase, params.id);
	if (!session) {
		error(404, tForLocale(locale, 'errors.sessionNotFound'));
	}

	const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);

	try {
		await assertCanManageClub(supabase, user.id, session.club_id, effectiveAppRole);
	} catch {
		error(403, tForLocale(locale, 'errors.clubAdminRequired'));
	}

	if (session.status !== 'in_progress') {
		redirect(303, `/sessions/${session.id}/control`);
	}

	await expirePendingMatches(supabase, session.id);

	const match = await loadMatchDetail(supabase, params.matchId);
	if (!match || match.session_id !== session.id) {
		error(404, tForLocale(locale, 'errors.matchNotFound'));
	}

	if (!['active', 'suspended', 'score_pending'].includes(match.status)) {
		redirect(303, `/sessions/${session.id}/control`);
	}

	return { session, match };
};

export const actions = {
	addShuttle: async ({ params, locals: { supabase, user, appRole, locale } }) => {
		if (!user || !appRole) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const result = await addMatchShuttle(supabase, params.matchId);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: tForLocale(locale, 'match.action.shuttleAdded') };
	},

	endNoScore: async ({ params, locals: { supabase, user, appRole, locale } }) => {
		if (!user || !appRole) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const result = await endMatchNoScore(supabase, params.matchId);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		redirect(303, `/sessions/${params.id}/control`);
	},

	endWithScore: async ({ params, request, locals: { supabase, user, appRole, locale } }) => {
		if (!user || !appRole) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const games = readMatchGames(await request.formData());
		if (!games?.length) {
			return fail(400, { message: tForLocale(locale, 'match.action.scoreRequired') });
		}

		const result = await endMatchWithScore(supabase, params.matchId, games);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		redirect(303, `/sessions/${params.id}/control`);
	},

	resolveScore: async ({ params, request, locals: { supabase, user, appRole, locale } }) => {
		if (!user || !appRole) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const games = readMatchGames(await request.formData());
		if (!games?.length) {
			return fail(400, { message: tForLocale(locale, 'match.action.scoreRequired') });
		}

		const result = await resolveMatchScore(supabase, params.matchId, games);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		redirect(303, `/sessions/${params.id}/control`);
	}
} satisfies Actions;
