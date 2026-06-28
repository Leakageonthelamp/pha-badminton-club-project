import type { SessionCancelSource, SessionStatus } from '$lib/types/session';

export const sessionCancelSourceLabel = (source: SessionCancelSource): string => {
	switch (source) {
		case 'club_admin':
			return 'Club admin';
		case 'super_admin':
			return 'Super admin';
		case 'system':
			return 'Automatic';
	}
};

export type SessionCancelDisplayInput = {
	status: SessionStatus;
	cancel_source: SessionCancelSource | null;
	cancel_reason: string | null;
	cancelled_by_name?: string | null;
};

export const sessionCancelDetail = (session: SessionCancelDisplayInput): string | null => {
	if (session.status !== 'cancelled') return null;

	const reason = session.cancel_reason?.trim();
	if (!reason && !session.cancel_source) return 'Session was cancelled.';

	const sourceLabel = session.cancel_source ? sessionCancelSourceLabel(session.cancel_source) : null;
	const byName =
		session.cancelled_by_name && session.cancel_source !== 'system'
			? ` (${session.cancelled_by_name})`
			: '';

	if (sourceLabel && reason) return `${sourceLabel}${byName} · ${reason}`;
	if (sourceLabel) return `${sourceLabel}${byName}`;
	return reason ?? 'Session was cancelled.';
};
