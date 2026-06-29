import type { ClubSessionPublic } from '$lib/types/club';
import type { SessionListItem, SessionPlayerStatus } from '$lib/types/session';

const activeMembershipStatuses = new Set<SessionPlayerStatus>(['waiting', 'queued', 'confirmed']);

type SessionWithMembership = {
	status: SessionListItem['status'];
	my_membership: SessionListItem['my_membership'] | ClubSessionPublic['my_membership'];
};

export const liveSessionHref = (sessionId: string): string => `/sessions/${sessionId}/live`;

export const shouldOpenLiveSession = (session: SessionWithMembership): boolean =>
	session.status === 'in_progress' &&
	session.my_membership !== null &&
	activeMembershipStatuses.has(session.my_membership.status);

/** Closed sessions the player actually played — history opens live summary. */
export const shouldOpenHistorySessionSummary = (item: {
	status: SessionListItem['status'];
	membership_status: SessionPlayerStatus;
}): boolean =>
	item.status === 'closed' &&
	(item.membership_status === 'confirmed' || item.membership_status === 'left');

export const shouldViewSessionLivePage = (session: SessionWithMembership): boolean => {
	const membershipStatus = session.my_membership?.status;
	if (!membershipStatus) return false;
	if (shouldOpenLiveSession(session)) return true;
	if (membershipStatus === 'left') return true;
	return session.status === 'closed' && membershipStatus === 'confirmed';
};

export const findLiveSession = (sessions: SessionListItem[]): SessionListItem | null =>
	sessions.find(shouldOpenLiveSession) ?? null;

export const matchLiveHref = (sessionId: string, matchId: string): string =>
	`/sessions/${sessionId}/live/match/${matchId}`;

export const shouldOpenMatchLive = (match: { status: string } | null | undefined): boolean =>
	match?.status === 'active';

export const isInUnresolvedMatch = (match: { status: string } | null | undefined): boolean =>
	Boolean(match && ['active', 'score_pending', 'suspended', 'pending'].includes(match.status));
