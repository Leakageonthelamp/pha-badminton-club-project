import type { ClubSessionPublic } from '$lib/types/club';
import type { SessionListItem, SessionPlayerStatus } from '$lib/types/session';

type SessionWithMembership = {
	status: SessionListItem['status'];
	my_membership: SessionListItem['my_membership'] | ClubSessionPublic['my_membership'];
};

export const liveSessionHref = (sessionId: string): string => `/sessions/${sessionId}/live`;

export const shouldOpenLiveSession = (session: SessionWithMembership): boolean =>
	session.status === 'in_progress' && session.my_membership?.status === 'confirmed';

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
	hasCourtMatch(match);

/** Auto-redirect when play starts — not when score confirmation begins. */
export const shouldAutoOpenMatchLive = (match: { status: string } | null | undefined): boolean =>
	match?.status === 'active';

export const isInUnresolvedMatch = (match: { status: string } | null | undefined): boolean =>
	Boolean(match && ['active', 'score_pending', 'suspended', 'pending'].includes(match.status));

export const hasCourtMatch = (match: { status: string } | null | undefined): boolean =>
	Boolean(match && ['active', 'score_pending', 'suspended'].includes(match.status));

const matchLiveDismissKey = (sessionId: string, matchId: string): string =>
	`ph:match-live-dismissed:${sessionId}:${matchId}`;

/** Player chose session live over match live — skip auto-open until match ends. */
export const isMatchLiveDismissed = (sessionId: string, matchId: string): boolean => {
	if (typeof sessionStorage === 'undefined') return false;
	return sessionStorage.getItem(matchLiveDismissKey(sessionId, matchId)) === '1';
};

export const dismissMatchLive = (sessionId: string, matchId: string): void => {
	if (typeof sessionStorage === 'undefined') return;
	sessionStorage.setItem(matchLiveDismissKey(sessionId, matchId), '1');
};

export const clearMatchLiveDismissed = (sessionId: string, matchId: string): void => {
	if (typeof sessionStorage === 'undefined') return;
	sessionStorage.removeItem(matchLiveDismissKey(sessionId, matchId));
};
