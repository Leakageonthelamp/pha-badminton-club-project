import type { SessionJoinConflict, SessionPlayerStatus, SessionStatus } from '$lib/types/session';
import { LIVE_SESSION_JOIN_BUFFER_MS } from '$lib/config/session';

export const sessionsTimeOverlap = (
	aStart: string,
	aEnd: string,
	bStart: string,
	bEnd: string
): boolean =>
	new Date(aStart).getTime() < new Date(bEnd).getTime() &&
	new Date(aEnd).getTime() > new Date(bStart).getTime();

export const sessionStartsTooSoonAfterLive = (targetStart: string, liveEnd: string): boolean =>
	new Date(targetStart).getTime() <
	new Date(liveEnd).getTime() + LIVE_SESSION_JOIN_BUFFER_MS;

type ActiveMembership = {
	status: SessionPlayerStatus;
	session: {
		id: string;
		name: string;
		start_at: string;
		end_at: string;
		status: SessionStatus;
	};
};

export const pickJoinConflict = (
	target: { id: string; start_at: string; end_at: string },
	memberships: ActiveMembership[]
): SessionJoinConflict | null => {
	const other = memberships.filter((row) => row.session.id !== target.id);

	for (const row of other) {
		if (
			(row.status === 'waiting' || row.status === 'queued' || row.status === 'confirmed') &&
			sessionsTimeOverlap(
				row.session.start_at,
				row.session.end_at,
				target.start_at,
				target.end_at
			)
		) {
			return {
				kind: 'overlapping',
				session_id: row.session.id,
				session_name: row.session.name,
				start_at: row.session.start_at,
				end_at: row.session.end_at,
				membership_status: row.status
			};
		}
	}

	for (const row of other) {
		if (
			row.status === 'confirmed' &&
			row.session.status === 'in_progress' &&
			sessionStartsTooSoonAfterLive(target.start_at, row.session.end_at)
		) {
			return {
				kind: 'too_soon_after_live',
				session_id: row.session.id,
				session_name: row.session.name,
				start_at: row.session.start_at,
				end_at: row.session.end_at,
				membership_status: row.status
			};
		}
	}

	return null;
};

export const joinConflictMembershipPhrase = (status: SessionPlayerStatus): string => {
	switch (status) {
		case 'waiting':
			return 'on the waiting list for';
		case 'queued':
			return 'in the buffer queue for';
		case 'confirmed':
			return 'confirmed for';
		default:
			return 'joined';
	}
};
