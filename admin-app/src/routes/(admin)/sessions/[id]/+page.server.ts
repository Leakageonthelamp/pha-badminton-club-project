import { resolveEffectiveAppRole } from '$lib/server/adminDashboardMode';
import { assertCanManageClub, assertSuperAdmin } from '$lib/server/clubAccess';
import {
	confirmSessionPlayer,
	isAdminActionWindowOpen,
	loadSessionPlayers,
	rejectSessionPlayer
} from '$lib/server/sessionPlayers';
import { loadSessionDetail } from '$lib/server/sessions';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({
	params,
	url,
	cookies,
	locals: { supabase, user, appRole }
}) => {
	if (!user || !appRole) {
		error(401, 'Sign in required');
	}

	const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
	const session = await loadSessionDetail(supabase, params.id);

	if (!session) {
		error(404, 'Session not found');
	}

	let canManage = false;
	try {
		await assertCanManageClub(supabase, user.id, session.club_id, effectiveAppRole);
		canManage = true;
	} catch {
		canManage = false;
	}

	const players = canManage ? await loadSessionPlayers(supabase, session.id) : [];
	const adminActionWindowOpen = isAdminActionWindowOpen(session.start_at, session.end_at);

	return {
		session,
		players,
		canManage,
		adminActionWindowOpen,
		isSuperAdmin: effectiveAppRole === 'super_admin',
		isHost: session.host_id === user.id,
		created: url.searchParams.get('created') === '1'
	};
};

export const actions: Actions = {
	forceEnd: async ({ params, locals: { supabase, appRole } }) => {
		assertSuperAdmin(appRole);

		const { error: updateError } = await supabase
			.from('sessions')
			.update({ status: 'closed' })
			.eq('id', params.id);

		if (updateError) {
			console.error('Failed to force end session', updateError);
			return fail(500, { message: 'Could not force end session. Please try again.' });
		}

		return { success: true, message: 'Session force ended.' };
	},

	confirm: async ({ request, cookies, locals: { supabase, user, appRole } }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		const formData = await request.formData();
		const sessionId = formData.get('session_id');
		const playerId = formData.get('player_id');

		if (typeof sessionId !== 'string' || !sessionId || typeof playerId !== 'string' || !playerId) {
			return fail(400, { message: 'Invalid request' });
		}

		const sessionDetail = await loadSessionDetail(supabase, sessionId);
		if (!sessionDetail) {
			return fail(404, { message: 'Session not found' });
		}

		try {
			await assertCanManageClub(supabase, user.id, sessionDetail.club_id, effectiveAppRole);
		} catch {
			return fail(403, { message: 'Club admin access required' });
		}

		const result = await confirmSessionPlayer(supabase, playerId);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: 'Player confirmed.' };
	},

	reject: async ({ request, cookies, locals: { supabase, user, appRole } }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		const formData = await request.formData();
		const sessionId = formData.get('session_id');
		const playerId = formData.get('player_id');

		if (typeof sessionId !== 'string' || !sessionId || typeof playerId !== 'string' || !playerId) {
			return fail(400, { message: 'Invalid request' });
		}

		const sessionDetail = await loadSessionDetail(supabase, sessionId);
		if (!sessionDetail) {
			return fail(404, { message: 'Session not found' });
		}

		try {
			await assertCanManageClub(supabase, user.id, sessionDetail.club_id, effectiveAppRole);
		} catch {
			return fail(403, { message: 'Club admin access required' });
		}

		const result = await rejectSessionPlayer(supabase, playerId);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: 'Player rejected.' };
	}
};
