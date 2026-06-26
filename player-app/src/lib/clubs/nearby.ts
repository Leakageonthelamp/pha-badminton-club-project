import type { ClubPublic } from '$lib/types/club';
import { haversineDistanceKm, type StoredUserLocation } from '@repo/ui/geolocation';

export type ClubWithDistance = ClubPublic & { distanceKm: number | null };

export const clubsWithDistance = (
	clubs: ClubPublic[],
	userLocation: StoredUserLocation | null
): ClubWithDistance[] => {
	const mapped = clubs.map((club) => {
		const distanceKm =
			userLocation && club.latitude !== null && club.longitude !== null
				? haversineDistanceKm(
						userLocation.latitude,
						userLocation.longitude,
						club.latitude,
						club.longitude
					)
				: null;

		return { ...club, distanceKm };
	});

	if (userLocation) {
		return mapped.sort((a, b) => {
			if (a.distanceKm === null && b.distanceKm === null) return a.name.localeCompare(b.name);
			if (a.distanceKm === null) return 1;
			if (b.distanceKm === null) return -1;
			if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
			return a.name.localeCompare(b.name);
		});
	}

	return mapped.sort((a, b) => a.name.localeCompare(b.name));
};
