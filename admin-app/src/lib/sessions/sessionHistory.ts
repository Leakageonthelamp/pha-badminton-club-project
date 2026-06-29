import { computeCourtShare, isOutstandingCancellationFee } from '@repo/ui/payments';
import { formatSessionDuration } from '@repo/ui/datetime';
import type { SessionPaymentWithProfile } from '$lib/types/payment';
import type { SessionDetail, SessionPlayerStatus, SessionPlayerWithProfile } from '$lib/types/session';

export { isOutstandingCancellationFee, formatSessionDuration };

export const ATTENDED_PLAYER_STATUSES: SessionPlayerStatus[] = ['confirmed', 'left'];

export const isAttendedPlayer = (status: SessionPlayerStatus): boolean =>
	status === 'confirmed' || status === 'left';

export const resolveSessionFinishedAt = (
	session: Pick<SessionDetail, 'status' | 'finished_at' | 'updated_at'>
): string | null => {
	if (session.finished_at) {
		return session.finished_at;
	}

	if (session.status === 'closed' || session.status === 'cancelled') {
		return session.updated_at;
	}

	return null;
};

export const formatSessionUptime = (
	startAt: string,
	session: Pick<SessionDetail, 'status' | 'finished_at' | 'updated_at'>
): string => {
	const finishedAt = resolveSessionFinishedAt(session);
	if (!finishedAt) return '—';

	return formatSessionDuration(startAt, finishedAt);
};

/** Time past scheduled end until session close; null when closed on time or early. */
export const formatSessionOverdue = (
	endAt: string,
	session: Pick<SessionDetail, 'status' | 'finished_at' | 'updated_at'>
): string | null => {
	const finishedAt = resolveSessionFinishedAt(session);
	if (!finishedAt) return null;

	const endMs = new Date(endAt).getTime();
	const finishedMs = new Date(finishedAt).getTime();
	if (Number.isNaN(endMs) || Number.isNaN(finishedMs) || finishedMs <= endMs) return null;

	return formatSessionDuration(endAt, finishedAt);
};

type MatchSummaryInput = { status: string; shuttles_used: number };

export const countCompletedMatches = (matches: MatchSummaryInput[]): number =>
	matches.filter((match) => match.status === 'completed').length;

export const computeMatchShuttleUsage = (matches: MatchSummaryInput[]): number =>
	matches
		.filter((match) => match.status === 'completed')
		.reduce((sum, match) => sum + match.shuttles_used, 0);

export type SessionHistorySummary = {
	durationLabel: string;
	uptimeLabel: string;
	overdueLabel: string | null;
	attendedCount: number;
	rosterCount: number;
	matchCount: number;
	totalShuttleUsage: number;
	perPlayerCourtShare: number;
	paymentsApprovedCount: number;
	paymentsSubmittedCount: number;
	paymentsPendingCount: number;
	totalCollected: number;
	totalBilled: number;
	cancellationFeesCollected: number;
	cancellationFeesOutstandingCount: number;
	cancellationFeesPaidCount: number;
	cancellationFeesWaivedCount: number;
};

export const computeTotalShuttleUsage = (
	payments: Pick<SessionPaymentWithProfile, 'shuttle_share'>[],
	shuttlePricePerEach: number
): number => {
	if (shuttlePricePerEach <= 0) return 0;

	const totalShuttleShare = payments.reduce((sum, payment) => sum + payment.shuttle_share, 0);
	if (totalShuttleShare <= 0) return 0;

	return Math.round(totalShuttleShare / shuttlePricePerEach);
};

export const buildSessionHistorySummary = (
	session: Pick<
		SessionDetail,
		| 'start_at'
		| 'end_at'
		| 'status'
		| 'finished_at'
		| 'updated_at'
		| 'court_fee_per_hour'
		| 'court_count'
		| 'shuttle_price_per_each'
	>,
	players: SessionPlayerWithProfile[],
	payments: SessionPaymentWithProfile[],
	matches: MatchSummaryInput[] = []
): SessionHistorySummary => {
	const attendedCount = players.filter((player) => isAttendedPlayer(player.status)).length;
	const matchCount = countCompletedMatches(matches);
	const shuttleUsageFromMatches = computeMatchShuttleUsage(matches);
	const perPlayerCourtShare = computeCourtShare({
		courtFeePerHour: session.court_fee_per_hour,
		startAt: session.start_at,
		endAt: session.end_at,
		courtCount: session.court_count,
		activePlayers: attendedCount
	});

	const paymentsApprovedCount = payments.filter((payment) => payment.status === 'approved').length;
	const paymentsSubmittedCount = payments.filter((payment) => payment.status === 'submitted').length;
	const paymentsPendingCount = payments.filter((payment) => payment.status === 'pending').length;
	const totalCollected = payments
		.filter((payment) => payment.status === 'approved')
		.reduce((sum, payment) => sum + payment.total_amount, 0);
	const totalBilled = payments.reduce((sum, payment) => sum + payment.total_amount, 0);

	const cancellationFeePlayers = players.filter((player) => player.fee_owed > 0);
	const cancellationFeesCollected = cancellationFeePlayers
		.filter((player) => player.fee_status === 'paid')
		.reduce((sum, player) => sum + player.fee_owed, 0);
	const cancellationFeesOutstandingCount = cancellationFeePlayers.filter((player) =>
		isOutstandingCancellationFee(player.fee_owed, player.fee_status)
	).length;
	const cancellationFeesPaidCount = cancellationFeePlayers.filter(
		(player) => player.fee_status === 'paid'
	).length;
	const cancellationFeesWaivedCount = cancellationFeePlayers.filter(
		(player) => player.fee_status === 'waived'
	).length;

	return {
		durationLabel: formatSessionDuration(session.start_at, session.end_at),
		uptimeLabel: formatSessionUptime(session.start_at, session),
		overdueLabel: formatSessionOverdue(session.end_at, session),
		attendedCount,
		rosterCount: players.length,
		matchCount,
		totalShuttleUsage:
			shuttleUsageFromMatches > 0
				? shuttleUsageFromMatches
				: computeTotalShuttleUsage(payments, session.shuttle_price_per_each),
		perPlayerCourtShare,
		paymentsApprovedCount,
		paymentsSubmittedCount,
		paymentsPendingCount,
		totalCollected,
		totalBilled,
		cancellationFeesCollected,
		cancellationFeesOutstandingCount,
		cancellationFeesPaidCount,
		cancellationFeesWaivedCount
	};
};
