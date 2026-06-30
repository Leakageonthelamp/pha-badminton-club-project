import { resolveEffectiveAppRole } from '$lib/server/adminDashboardMode';
import { assertCanManageClub, assertSuperAdmin } from '$lib/server/clubAccess';
import {
	confirmSessionPlayer,
	confirmCancellationFee,
	isAdminActionWindowOpen,
	loadSessionCancellationFees,
	loadSessionPlayerHistory,
	loadSessionPlayers,
	rejectSessionPlayer,
	waiveCancellationFee
} from '$lib/server/sessionPlayers';
import { loadSessionPayments } from '$lib/server/sessionControl';
import { loadSessionMatches } from '$lib/server/matches';
import { loadSessionDetail, releaseActiveSessionPlayers, sweepOverdueDraftSessions, sweepStartedSessions } from '$lib/server/sessions';
import { draftOpenDeadlineMs, isDraftOpenWindowOpen, isHistorySession, isSessionMutable } from '$lib/sessions/list';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({
	params,
	url,
	cookies,
	depends,
	locals: { supabase, user, appRole }
}) => {
	depends('app:session-detail');

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

	let canManage = false;
	try {
		await assertCanManageClub(supabase, user.id, session.club_id, effectiveAppRole);
		canManage = true;
	} catch {
		canManage = false;
	}

	const isHistoryView = isHistorySession(session);

	const players =
		canManage && !isHistoryView && session.status !== 'draft'
			? await loadSessionPlayers(supabase, session.id)
			: [];
	const historyPlayers = isHistoryView ? await loadSessionPlayerHistory(supabase, session.id) : [];
	const historyPayments = isHistoryView ? await loadSessionPayments(supabase, session.id) : [];
	const historyMatches = isHistoryView ? await loadSessionMatches(supabase, session.id) : [];
	const cancellationFees = canManage
		? await loadSessionCancellationFees(supabase, session.id)
		: [];
	const adminActionWindowOpen = isAdminActionWindowOpen(session.start_at, session.end_at);
	const draftOpenDeadline = new Date(draftOpenDeadlineMs(session.start_at)).toISOString();
	const canOpen =
		canManage &&
		session.status === 'draft' &&
		isDraftOpenWindowOpen(session.start_at);
	const canModify =
		canManage &&
		(session.status === 'draft' || session.status === 'open') &&
		isSessionMutable(session.start_at);
	const canControl = canManage && session.status === 'in_progress';

	return {
		session,
		players,
		historyPlayers,
		historyPayments,
		historyMatches,
		cancellationFees,
		isHistoryView,
		canManage,
		canOpen,
		canModify,
		canControl,
		draftOpenDeadline,
		adminActionWindowOpen,
		isSuperAdmin: effectiveAppRole === 'super_admin',
		isHost: session.host_id === user.id,
		created: url.searchParams.get('created') === '1',
		edited: url.searchParams.get('edited') === '1'
	};
};

export const actions: Actions = {
	openSession: async ({ params, cookies, locals: { supabase, user, appRole } }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		const sessionDetail = await loadSessionDetail(supabase, params.id);

		if (!sessionDetail) {
			return fail(404, { message: 'Session not found' });
		}

		try {
			await assertCanManageClub(supabase, user.id, sessionDetail.club_id, effectiveAppRole);
		} catch {
			return fail(403, { message: 'Club admin access required' });
		}

		if (sessionDetail.status !== 'draft') {
			return fail(400, { message: 'Session is not a draft.' });
		}

		if (!isDraftOpenWindowOpen(sessionDetail.start_at)) {
			await sweepOverdueDraftSessions(supabase, { clubIds: [sessionDetail.club_id] });
			return fail(400, {
				message:
					'The open window has passed. This draft was auto-cancelled because it was not opened at least 1 hour before start.'
			});
		}

		const { data, error: updateError } = await supabase
			.from('sessions')
			.update({ status: 'open' })
			.eq('id', params.id)
			.eq('status', 'draft')
			.select('id')
			.maybeSingle();

		if (updateError) {
			console.error('Failed to open session', updateError);
			return fail(500, { message: 'Could not open session. Please try again.' });
		}

		if (!data) {
			return fail(400, { message: 'Session is no longer a draft.' });
		}

		return { success: true, message: 'Session opened. Players can now join.' };
	},

	cancel: async ({ params, cookies, locals: { supabase, user, appRole } }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		const sessionDetail = await loadSessionDetail(supabase, params.id);

		if (!sessionDetail) {
			return fail(404, { message: 'Session not found' });
		}

		try {
			await assertCanManageClub(supabase, user.id, sessionDetail.club_id, effectiveAppRole);
		} catch {
			return fail(403, { message: 'Club admin access required' });
		}

		if (sessionDetail.status !== 'draft' && sessionDetail.status !== 'open') {
			return fail(400, { message: 'Only draft or open sessions can be cancelled.' });
		}

		if (!isSessionMutable(sessionDetail.start_at)) {
			return fail(400, {
				message: 'This session can no longer be cancelled within 15 minutes of start.'
			});
		}

		const cancelSource = effectiveAppRole === 'super_admin' ? 'super_admin' : 'club_admin';
		const cancelReason =
			cancelSource === 'super_admin'
				? 'Cancelled by super admin.'
				: 'Cancelled by club admin.';

		const { data, error: updateError } = await supabase
			.from('sessions')
			.update({
				status: 'cancelled',
				cancel_source: cancelSource,
				cancel_reason: cancelReason,
				cancelled_by: user.id
			})
			.eq('id', params.id)
			.in('status', ['draft', 'open'])
			.select('id')
			.maybeSingle();

		if (updateError) {
			console.error('Failed to cancel session', updateError);
			return fail(500, { message: 'Could not cancel session. Please try again.' });
		}

		if (!data) {
			return fail(400, { message: 'Session is no longer cancellable.' });
		}

		const releaseResult = await releaseActiveSessionPlayers(supabase, params.id);
		if (!releaseResult.ok) {
			return fail(500, { message: releaseResult.message });
		}

		return { success: true, message: 'Session cancelled.' };
	},

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
	},

	confirmFee: async ({ request, cookies, locals: { supabase, user, appRole } }) => {
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

		const result = await confirmCancellationFee(supabase, playerId);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: 'Cancellation fee confirmed.' };
	},

	waiveFee: async ({ request, cookies, locals: { supabase, user, appRole } }) => {
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

		const result = await waiveCancellationFee(supabase, playerId);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: 'Cancellation fee waived.' };
	}
};
