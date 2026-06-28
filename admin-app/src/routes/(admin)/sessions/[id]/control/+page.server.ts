import { resolveEffectiveAppRole } from '$lib/server/adminDashboardMode';
import { assertCanManageClub } from '$lib/server/clubAccess';
import { loadSessionDetail, sweepOverdueDraftSessions, sweepStartedSessions } from '$lib/server/sessions';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({
	params,
	cookies,
	locals: { supabase, user, appRole }
}) => {
	if (!user || !appRole) {
		error(401, 'Sign in required');
	}

	const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
	const initialSession = await loadSessionDetail(supabase, params.id);

	if (!initialSession) {
		error(404, 'Session not found');
	}

	await sweepOverdueDraftSessions(supabase, { clubIds: [initialSession.club_id] });
	await sweepStartedSessions(supabase);

	const session = (await loadSessionDetail(supabase, params.id)) ?? initialSession;

	try {
		await assertCanManageClub(supabase, user.id, session.club_id, effectiveAppRole);
	} catch {
		error(403, 'Club admin access required');
	}

	if (session.status !== 'in_progress') {
		redirect(303, `/sessions/${session.id}`);
	}

	return { session };
};
