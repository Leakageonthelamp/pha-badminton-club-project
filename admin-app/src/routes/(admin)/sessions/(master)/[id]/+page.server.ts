import { tForLocale } from '$lib/i18n';
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
	locals: { supabase, user, appRole, locale }
}) => {
	depends('app:session-detail');

	if (!user || !appRole) {
		error(401, tForLocale(locale, 'auth.error.signInRequired'));
	}

	const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);

	const initialSession = await loadSessionDetail(supabase, params.id);

	if (!initialSession) {
		error(404, tForLocale(locale, 'errors.sessionNotFound'));
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
	openSession: async ({ params, cookies, locals: { supabase, user, appRole, locale } }) => {
		if (!user || !appRole) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		const sessionDetail = await loadSessionDetail(supabase, params.id);

		if (!sessionDetail) {
			return fail(404, { message: tForLocale(locale, 'errors.sessionNotFound') });
		}

		try {
			await assertCanManageClub(supabase, user.id, sessionDetail.club_id, effectiveAppRole);
		} catch {
			return fail(403, { message: tForLocale(locale, 'errors.clubAdminRequired') });
		}

		if (sessionDetail.status !== 'draft') {
			return fail(400, { message: tForLocale(locale, 'session.action.notDraft') });
		}

		if (!isDraftOpenWindowOpen(sessionDetail.start_at)) {
			await sweepOverdueDraftSessions(supabase, { clubIds: [sessionDetail.club_id] });
			return fail(400, {
				message: tForLocale(locale, 'session.action.openWindowPassed')
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
			return fail(500, { message: tForLocale(locale, 'session.action.openFailed') });
		}

		if (!data) {
			return fail(400, { message: tForLocale(locale, 'session.action.noLongerDraft') });
		}

		return { success: true, message: tForLocale(locale, 'session.action.opened') };
	},

	cancel: async ({ params, cookies, locals: { supabase, user, appRole, locale } }) => {
		if (!user || !appRole) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		const sessionDetail = await loadSessionDetail(supabase, params.id);

		if (!sessionDetail) {
			return fail(404, { message: tForLocale(locale, 'errors.sessionNotFound') });
		}

		try {
			await assertCanManageClub(supabase, user.id, sessionDetail.club_id, effectiveAppRole);
		} catch {
			return fail(403, { message: tForLocale(locale, 'errors.clubAdminRequired') });
		}

		if (sessionDetail.status !== 'draft' && sessionDetail.status !== 'open') {
			return fail(400, {
				message: tForLocale(locale, 'session.action.onlyDraftOrOpenCancellable')
			});
		}

		if (!isSessionMutable(sessionDetail.start_at)) {
			return fail(400, {
				message: tForLocale(locale, 'session.action.cancelLocked')
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
			return fail(500, { message: tForLocale(locale, 'session.action.cancelFailed') });
		}

		if (!data) {
			return fail(400, { message: tForLocale(locale, 'session.action.noLongerCancellable') });
		}

		const releaseResult = await releaseActiveSessionPlayers(supabase, params.id);
		if (!releaseResult.ok) {
			return fail(500, { message: releaseResult.message });
		}

		return { success: true, message: tForLocale(locale, 'session.action.cancelled') };
	},

	forceEnd: async ({ params, locals: { supabase, appRole, locale } }) => {
		assertSuperAdmin(appRole);

		const { error: updateError } = await supabase
			.from('sessions')
			.update({ status: 'closed' })
			.eq('id', params.id);

		if (updateError) {
			console.error('Failed to force end session', updateError);
			return fail(500, { message: tForLocale(locale, 'session.action.forceEndFailed') });
		}

		return { success: true, message: tForLocale(locale, 'session.action.forceEnded') };
	},

	confirm: async ({ request, cookies, locals: { supabase, user, appRole, locale } }) => {
		if (!user || !appRole) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		const formData = await request.formData();
		const sessionId = formData.get('session_id');
		const playerId = formData.get('player_id');

		if (typeof sessionId !== 'string' || !sessionId || typeof playerId !== 'string' || !playerId) {
			return fail(400, { message: tForLocale(locale, 'errors.invalidRequest') });
		}

		const sessionDetail = await loadSessionDetail(supabase, sessionId);
		if (!sessionDetail) {
			return fail(404, { message: tForLocale(locale, 'errors.sessionNotFound') });
		}

		try {
			await assertCanManageClub(supabase, user.id, sessionDetail.club_id, effectiveAppRole);
		} catch {
			return fail(403, { message: tForLocale(locale, 'errors.clubAdminRequired') });
		}

		const result = await confirmSessionPlayer(supabase, playerId);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: tForLocale(locale, 'session.action.playerConfirmed') };
	},

	reject: async ({ request, cookies, locals: { supabase, user, appRole, locale } }) => {
		if (!user || !appRole) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		const formData = await request.formData();
		const sessionId = formData.get('session_id');
		const playerId = formData.get('player_id');

		if (typeof sessionId !== 'string' || !sessionId || typeof playerId !== 'string' || !playerId) {
			return fail(400, { message: tForLocale(locale, 'errors.invalidRequest') });
		}

		const sessionDetail = await loadSessionDetail(supabase, sessionId);
		if (!sessionDetail) {
			return fail(404, { message: tForLocale(locale, 'errors.sessionNotFound') });
		}

		try {
			await assertCanManageClub(supabase, user.id, sessionDetail.club_id, effectiveAppRole);
		} catch {
			return fail(403, { message: tForLocale(locale, 'errors.clubAdminRequired') });
		}

		const result = await rejectSessionPlayer(supabase, playerId);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: tForLocale(locale, 'session.action.playerRejected') };
	},

	confirmFee: async ({ request, cookies, locals: { supabase, user, appRole, locale } }) => {
		if (!user || !appRole) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		const formData = await request.formData();
		const sessionId = formData.get('session_id');
		const playerId = formData.get('player_id');

		if (typeof sessionId !== 'string' || !sessionId || typeof playerId !== 'string' || !playerId) {
			return fail(400, { message: tForLocale(locale, 'errors.invalidRequest') });
		}

		const sessionDetail = await loadSessionDetail(supabase, sessionId);
		if (!sessionDetail) {
			return fail(404, { message: tForLocale(locale, 'errors.sessionNotFound') });
		}

		try {
			await assertCanManageClub(supabase, user.id, sessionDetail.club_id, effectiveAppRole);
		} catch {
			return fail(403, { message: tForLocale(locale, 'errors.clubAdminRequired') });
		}

		const result = await confirmCancellationFee(supabase, playerId);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: tForLocale(locale, 'session.action.feeConfirmed') };
	},

	waiveFee: async ({ request, cookies, locals: { supabase, user, appRole, locale } }) => {
		if (!user || !appRole) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		const formData = await request.formData();
		const sessionId = formData.get('session_id');
		const playerId = formData.get('player_id');

		if (typeof sessionId !== 'string' || !sessionId || typeof playerId !== 'string' || !playerId) {
			return fail(400, { message: tForLocale(locale, 'errors.invalidRequest') });
		}

		const sessionDetail = await loadSessionDetail(supabase, sessionId);
		if (!sessionDetail) {
			return fail(404, { message: tForLocale(locale, 'errors.sessionNotFound') });
		}

		try {
			await assertCanManageClub(supabase, user.id, sessionDetail.club_id, effectiveAppRole);
		} catch {
			return fail(403, { message: tForLocale(locale, 'errors.clubAdminRequired') });
		}

		const result = await waiveCancellationFee(supabase, playerId);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: tForLocale(locale, 'session.action.feeWaived') };
	}
};
