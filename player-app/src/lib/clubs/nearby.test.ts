import { t } from '@repo/ui/i18n';
import { describe, expect, it } from 'vitest';
import { clubsWithDistance, formatOpenSessionBadge, openSessionCountByClub } from './nearby';
import type { ClubPublic } from '$lib/types/club';

const clubs: ClubPublic[] = [
	{
		id: 'a',
		name: 'Alpha',
		description: '',
		venue_name: null,
		latitude: 13.7563,
		longitude: 100.5018
	},
	{
		id: 'b',
		name: 'Bravo',
		description: '',
		venue_name: null,
		latitude: 13.73,
		longitude: 100.52
	},
	{
		id: 'c',
		name: 'Charlie',
		description: '',
		venue_name: null,
		latitude: null,
		longitude: null
	}
];

describe('clubsWithDistance', () => {
	it('sorts by name when user location is unavailable', () => {
		const sorted = clubsWithDistance(clubs, null);
		expect(sorted.map((club) => club.id)).toEqual(['a', 'b', 'c']);
		expect(sorted.every((club) => club.distanceKm === null)).toBe(true);
	});

	it('sorts nearest first and puts clubs without coordinates last', () => {
		const sorted = clubsWithDistance(clubs, {
			latitude: 13.7563,
			longitude: 100.5018,
			at: Date.now()
		});

		expect(sorted[0]?.id).toBe('a');
		expect(sorted[0]?.distanceKm).toBe(0);
		expect(sorted[1]?.id).toBe('b');
		expect(sorted[1]?.distanceKm).toBeGreaterThan(0);
		expect(sorted[2]?.id).toBe('c');
		expect(sorted[2]?.distanceKm).toBeNull();
	});
});

describe('openSessionCountByClub', () => {
	it('counts sessions per club', () => {
		const counts = openSessionCountByClub([
			{ club_id: 'a' },
			{ club_id: 'a' },
			{ club_id: 'b' }
		]);

		expect(counts.get('a')).toBe(2);
		expect(counts.get('b')).toBe(1);
		expect(counts.get('c')).toBeUndefined();
	});

	it('formats open session badge labels', () => {
		expect(formatOpenSessionBadge(0)).toBe(t('openSessions.badge.none'));
		expect(formatOpenSessionBadge(1)).toBe(t('openSessions.badge.one'));
		expect(formatOpenSessionBadge(3)).toBe(t('openSessions.badge.many', { count: 3 }));
	});
});
