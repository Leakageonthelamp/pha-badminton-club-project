import { resolveEffectiveAppRole } from '$lib/server/adminDashboardMode';
import { assertCanManageClub } from '$lib/server/clubAccess';
import {
	approvePayment,
	approveSessionLeave,
	beginSessionSettlement,
	closeSession,
	endSessionEarly,
	countActiveSessionPlayers,
	loadSessionLeaveRequests,
	loadSessionPayments,
	rejectSessionLeave
} from '$lib/server/sessionControl';
import {
	confirmCancellationFee,
	loadSessionCancellationFees,
	loadSessionPlayers,
	waiveCancellationFee
} from '$lib/server/sessionPlayers';
import {
	createMatch,
	expirePendingMatches,
	loadSessionMatches,
	toCourtGridMatches
} from '$lib/server/matches';
import { loadSessionDetail, sweepOverdueDraftSessions, sweepStartedSessions } from '$lib/server/sessions';
import { computeCourtShare, isOutstandingCancellationFee } from '@repo/ui/payments';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({
	params,
	cookies,
	depends,
	locals: { supabase, user, appRole }
}) => {
	depends('app:session-control');

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
	await expirePendingMatches(supabase, params.id);

	const session = (await loadSessionDetail(supabase, params.id)) ?? initialSession;

	try {
		await assertCanManageClub(supabase, user.id, session.club_id, effectiveAppRole);
	} catch {
		error(403, 'Club admin access required');
	}

	if (session.status !== 'in_progress') {
		redirect(303, `/sessions/${session.id}`);
	}

	const [players, payments, leaveRequests, cancellationFees, matches] = await Promise.all([
		loadSessionPlayers(supabase, session.id),
		loadSessionPayments(supabase, session.id),
		loadSessionLeaveRequests(supabase, session.id),
		loadSessionCancellationFees(supabase, session.id),
		loadSessionMatches(supabase, session.id)
	]);

	const activePlayers = players.filter((player) => player.status === 'confirmed');
	const billedPlayers = players.filter(
		(player) => player.status === 'confirmed' || player.status === 'left'
	);
	const activePlayerCount = countActiveSessionPlayers(players);
	const perPlayerCost = computeCourtShare({
		courtFeePerHour: session.court_fee_per_hour,
		startAt: session.start_at,
		endAt: session.end_at,
		courtCount: session.court_count,
		activePlayers: activePlayerCount
	});

	const endReached = Date.now() >= new Date(session.end_at).getTime();
	const settlementStarted = session.settlement_started_at != null || session.ended_early;
	const allPaymentsApproved =
		billedPlayers.length === 0 ||
		billedPlayers.every((player) =>
			payments.some(
				(payment) => payment.user_id === player.user_id && payment.status === 'approved'
			)
		);

	const allCancellationFeesResolved = cancellationFees.every(
		(fee) => !isOutstandingCancellationFee(fee.fee_owed, fee.fee_status)
	);

	return {
		session,
		players,
		payments,
		leaveRequests,
		cancellationFees,
		matches,
		courtGridMatches: toCourtGridMatches(matches),
		completedMatches: matches.filter((match) => match.status === 'completed'),
		perPlayerCost,
		activePlayerCount,
		endReached,
		settlementStarted,
		allPaymentsApproved,
		allCancellationFeesResolved
	};
};

const readId = (formData: FormData, key: string): string | null => {
	const value = formData.get(key);
	return typeof value === 'string' && value ? value : null;
};

export const actions = {
	approvePayment: async ({ request, locals: { supabase, user, appRole }, cookies }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		const paymentId = readId(await request.formData(), 'payment_id');
		if (!paymentId) {
			return fail(400, { message: 'Payment is required' });
		}

		const result = await approvePayment(supabase, paymentId);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: 'Payment approved.' };
	},

	approveLeave: async ({ request, locals: { supabase, user, appRole } }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		const requestId = readId(await request.formData(), 'request_id');
		if (!requestId) {
			return fail(400, { message: 'Leave request is required' });
		}

		const result = await approveSessionLeave(supabase, requestId);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: 'Leave request approved.' };
	},

	rejectLeave: async ({ request, locals: { supabase, user, appRole } }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		const requestId = readId(await request.formData(), 'request_id');
		if (!requestId) {
			return fail(400, { message: 'Leave request is required' });
		}

		const result = await rejectSessionLeave(supabase, requestId);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: 'Leave request rejected.' };
	},

	beginSettlement: async ({ params, locals: { supabase, user, appRole }, cookies }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		const session = await loadSessionDetail(supabase, params.id);

		if (!session) {
			return fail(404, { message: 'Session not found' });
		}

		try {
			await assertCanManageClub(supabase, user.id, session.club_id, effectiveAppRole);
		} catch {
			return fail(403, { message: 'Club admin access required' });
		}

		const result = await beginSessionSettlement(supabase, session.id);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: 'Settlement started for all active players.' };
	},

	endSessionEarly: async ({ params, locals: { supabase, user, appRole }, cookies }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		const session = await loadSessionDetail(supabase, params.id);

		if (!session) {
			return fail(404, { message: 'Session not found' });
		}

		try {
			await assertCanManageClub(supabase, user.id, session.club_id, effectiveAppRole);
		} catch {
			return fail(403, { message: 'Club admin access required' });
		}

		const result = await endSessionEarly(supabase, session.id);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: 'Session ended early. All players have been billed.' };
	},

	closeSession: async ({ params, locals: { supabase, user, appRole }, cookies }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		const session = await loadSessionDetail(supabase, params.id);

		if (!session) {
			return fail(404, { message: 'Session not found' });
		}

		try {
			await assertCanManageClub(supabase, user.id, session.club_id, effectiveAppRole);
		} catch {
			return fail(403, { message: 'Club admin access required' });
		}

		const result = await closeSession(supabase, session.id);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		redirect(303, `/sessions/${session.id}`);
	},

	confirmFee: async ({ request, params, locals: { supabase, user, appRole }, cookies }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		const session = await loadSessionDetail(supabase, params.id);
		if (!session) {
			return fail(404, { message: 'Session not found' });
		}

		try {
			await assertCanManageClub(supabase, user.id, session.club_id, effectiveAppRole);
		} catch {
			return fail(403, { message: 'Club admin access required' });
		}

		const playerId = readId(await request.formData(), 'player_id');
		if (!playerId) {
			return fail(400, { message: 'Invalid request' });
		}

		const result = await confirmCancellationFee(supabase, playerId);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: 'Cancellation fee confirmed.' };
	},

	waiveFee: async ({ request, params, locals: { supabase, user, appRole }, cookies }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		const session = await loadSessionDetail(supabase, params.id);
		if (!session) {
			return fail(404, { message: 'Session not found' });
		}

		try {
			await assertCanManageClub(supabase, user.id, session.club_id, effectiveAppRole);
		} catch {
			return fail(403, { message: 'Club admin access required' });
		}

		const playerId = readId(await request.formData(), 'player_id');
		if (!playerId) {
			return fail(400, { message: 'Invalid request' });
		}

		const result = await waiveCancellationFee(supabase, playerId);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: 'Cancellation fee waived.' };
	},

	createMatch: async ({ request, params, locals: { supabase, user, appRole }, cookies }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		const session = await loadSessionDetail(supabase, params.id);
		if (!session) {
			return fail(404, { message: 'Session not found' });
		}

		try {
			await assertCanManageClub(supabase, user.id, session.club_id, effectiveAppRole);
		} catch {
			return fail(403, { message: 'Club admin access required' });
		}

		const formData = await request.formData();
		const courtNumber = Number(formData.get('court_number'));
		const userIds = formData.getAll('user_ids').filter((value): value is string => typeof value === 'string');

		if (!Number.isInteger(courtNumber) || courtNumber < 1) {
			return fail(400, { message: 'Court is required' });
		}

		const result = await createMatch(supabase, session.id, courtNumber, userIds);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: 'Match invite sent to players.' };
	}
} satisfies Actions;
