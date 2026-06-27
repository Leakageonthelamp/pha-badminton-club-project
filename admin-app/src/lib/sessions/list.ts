import { formatBangkokWithZone } from '$lib/datetime/bangkok';
import type { SessionListItem } from '$lib/types/session';

export const isHistorySession = (session: SessionListItem): boolean =>
	session.status === 'closed' || session.status === 'cancelled';

export const isUpcomingSession = (session: SessionListItem, now = Date.now()): boolean => {
	if (isHistorySession(session)) {
		return false;
	}

	return (
		session.status === 'open' ||
		session.status === 'in_progress' ||
		new Date(session.end_at).getTime() >= now
	);
};

export const filterUpcomingSessions = (
	sessions: SessionListItem[],
	now = Date.now()
): SessionListItem[] => sessions.filter((session) => isUpcomingSession(session, now));

export const filterHistorySessions = (sessions: SessionListItem[]): SessionListItem[] =>
	sessions
		.filter(isHistorySession)
		.sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());

export const formatSessionMeta = (session: SessionListItem, options?: { showClub?: boolean }): string => {
	const parts = [
		formatBangkokWithZone(session.start_at),
		options?.showClub ? session.club?.name : null,
		session.host?.display_name ? `Host: ${session.host.display_name}` : null
	].filter(Boolean);

	return parts.join(' · ');
};

export const filterSessionsByClub = (
	sessions: SessionListItem[],
	clubId: string | null | undefined
): SessionListItem[] =>
	clubId ? sessions.filter((session) => session.club_id === clubId) : sessions;
