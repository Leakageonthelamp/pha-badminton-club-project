import { isSessionJoinWindowOpen } from '$lib/config/session';
import type { SessionListItem } from '$lib/types/session';
import { haversineDistanceKm, type StoredUserLocation } from '@repo/ui/geolocation';

export type SessionWithDistance = SessionListItem & { distanceKm: number | null };

export const FEATURED_SESSIONS_LIMIT = 5;

const activeMembershipStatuses = new Set(['waiting', 'queued', 'confirmed']);

const isJoinableSessionStatus = (status: SessionListItem['status']): boolean =>
	status === 'open' || status === 'in_progress';

export const isJoinableFeaturedSession = (session: SessionListItem): boolean =>
	isJoinableSessionStatus(session.status) &&
	isSessionJoinWindowOpen(session.end_at) &&
	(!session.my_membership || !activeMembershipStatuses.has(session.my_membership.status)) &&
	session.my_membership?.status !== 'left';

export const isEarlyLeftSession = (session: SessionListItem): boolean =>
	session.status === 'in_progress' && session.my_membership?.status === 'left';

export const shouldShowInProgressJoinRemark = (session: SessionListItem): boolean =>
	session.status === 'in_progress' &&
	(!session.my_membership || !activeMembershipStatuses.has(session.my_membership.status)) &&
	session.my_membership?.status !== 'left';

export const sessionsWithDistance = (
	sessions: SessionListItem[],
	userLocation: StoredUserLocation | null
): SessionWithDistance[] => {
	const mapped = sessions.map((session) => {
		const distanceKm =
			userLocation && session.latitude !== null && session.longitude !== null
				? haversineDistanceKm(
						userLocation.latitude,
						userLocation.longitude,
						session.latitude,
						session.longitude
					)
				: null;

		return { ...session, distanceKm };
	});

	const byStart = (a: SessionWithDistance, b: SessionWithDistance) =>
		a.start_at.localeCompare(b.start_at);

	if (userLocation) {
		return mapped.sort((a, b) => {
			if (a.distanceKm === null && b.distanceKm === null) return byStart(a, b);
			if (a.distanceKm === null) return 1;
			if (b.distanceKm === null) return -1;
			if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
			return byStart(a, b);
		});
	}

	return mapped.sort(byStart);
};

export const featuredSessions = (
	sessions: SessionListItem[],
	userLocation: StoredUserLocation | null,
	limit = FEATURED_SESSIONS_LIMIT
): SessionWithDistance[] =>
	sessionsWithDistance(sessions.filter(isJoinableFeaturedSession), userLocation).slice(0, limit);

export const myJoinedSessions = (
	sessions: SessionListItem[],
	userLocation: StoredUserLocation | null
): SessionWithDistance[] =>
	sessionsWithDistance(
		sessions.filter(
			(session) =>
				session.my_membership !== null &&
				activeMembershipStatuses.has(session.my_membership.status)
		),
		userLocation
	);
