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

export const findLiveSession = (sessions: SessionListItem[]): SessionListItem | null =>
	sessions.find(shouldOpenLiveSession) ?? null;
