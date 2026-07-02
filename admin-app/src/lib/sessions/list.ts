import { SESSION_DRAFT_OPEN_LEAD_MINUTES, SESSION_EDIT_LOCK_LEAD_MINUTES } from '$lib/config/session';
import type { Locale } from '$lib/i18n';
import { tForLocale } from '$lib/i18n';
import type { SessionListItem } from '$lib/types/session';
import { formatDateTime } from '@repo/ui/datetime';
import { DEFAULT_LOCALE } from '@repo/ui/i18n';

export const isHistorySession = (session: SessionListItem): boolean =>
	session.status === 'closed' || session.status === 'cancelled';

export const isActiveSession = (session: SessionListItem): boolean =>
	session.status === 'draft' || session.status === 'open' || session.status === 'in_progress';

export const draftOpenDeadlineMs = (startAt: string): number =>
	new Date(startAt).getTime() - SESSION_DRAFT_OPEN_LEAD_MINUTES * 60 * 1000;

export const isDraftOpenWindowOpen = (startAt: string, now = Date.now()): boolean =>
	now <= draftOpenDeadlineMs(startAt);

export const isSessionMutable = (startAt: string, now = Date.now()): boolean =>
	now < new Date(startAt).getTime() - SESSION_EDIT_LOCK_LEAD_MINUTES * 60 * 1000;

export const isUpcomingSession = (session: SessionListItem, now = Date.now()): boolean => {
	if (isHistorySession(session) || session.status === 'draft') {
		return false;
	}

	if (session.status === 'in_progress') {
		return false;
	}

	return session.status === 'open' || new Date(session.end_at).getTime() >= now;
};

export const filterOngoingSessions = (sessions: SessionListItem[]): SessionListItem[] =>
	sessions.filter((session) => session.status === 'in_progress');

export const filterDraftSessions = (
	sessions: SessionListItem[],
	now = Date.now()
): SessionListItem[] =>
	sessions
		.filter(
			(session) => session.status === 'draft' && new Date(session.end_at).getTime() >= now
		)
		.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

export const filterActiveSessions = (sessions: SessionListItem[]): SessionListItem[] =>
	sessions.filter(isActiveSession);

export const filterUpcomingSessions = (
	sessions: SessionListItem[],
	now = Date.now()
): SessionListItem[] => sessions.filter((session) => isUpcomingSession(session, now));

export const filterHistorySessions = (sessions: SessionListItem[]): SessionListItem[] =>
	sessions
		.filter(isHistorySession)
		.sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());

export const formatSessionMeta = (
	session: SessionListItem,
	options?: { showClub?: boolean; locale?: Locale }
): string => {
	const locale = options?.locale ?? DEFAULT_LOCALE;
	const parts = [
		formatDateTime(session.start_at),
		options?.showClub ? session.club?.name : null,
		session.host?.display_name
			? tForLocale(locale, 'session.list.hostPrefix', { name: session.host.display_name })
			: null
	].filter(Boolean);

	return parts.join(' · ');
};

export const formatDraftOpenDeadline = (startAt: string): string =>
	formatDateTime(new Date(draftOpenDeadlineMs(startAt)).toISOString());

export const filterSessionsByClub = (
	sessions: SessionListItem[],
	clubId: string | null | undefined
): SessionListItem[] =>
	clubId ? sessions.filter((session) => session.club_id === clubId) : sessions;

export type AdminSessionSummary = {
	total: number;
	open: number;
	inProgress: number;
	draft: number;
};

export const summarizeAdminSessions = (
	sessions: SessionListItem[]
): AdminSessionSummary => {
	let open = 0;
	let inProgress = 0;
	let draft = 0;

	for (const session of sessions) {
		if (session.status === 'open') {
			open += 1;
		} else if (session.status === 'in_progress') {
			inProgress += 1;
		} else if (session.status === 'draft') {
			draft += 1;
		}
	}

	return {
		total: sessions.length,
		open,
		inProgress,
		draft
	};
};

export type AdminSessionHistorySummary = {
	total: number;
	closed: number;
	cancelled: number;
};

export const summarizeAdminSessionHistory = (
	sessions: SessionListItem[]
): AdminSessionHistorySummary => {
	let closed = 0;
	let cancelled = 0;

	for (const session of sessions) {
		if (session.status === 'closed') {
			closed += 1;
		} else if (session.status === 'cancelled') {
			cancelled += 1;
		}
	}

	return {
		total: sessions.length,
		closed,
		cancelled
	};
};
