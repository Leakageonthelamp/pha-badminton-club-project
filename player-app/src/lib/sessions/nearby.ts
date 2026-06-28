import type { SessionListItem } from '$lib/types/session';
import { haversineDistanceKm, type StoredUserLocation } from '@repo/ui/geolocation';

export type SessionWithDistance = SessionListItem & { distanceKm: number | null };

export const FEATURED_SESSIONS_LIMIT = 3;

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
): SessionWithDistance[] => sessionsWithDistance(sessions, userLocation).slice(0, limit);
