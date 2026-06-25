import { describe, expect, it } from 'vitest';
import { buildProfileSearchOrFilter } from './profileSearch';

describe('buildProfileSearchOrFilter', () => {
	it('includes normalized phone when searching local Thai format', () => {
		const filter = buildProfileSearchOrFilter('0900232123');
		expect(filter).toContain('phone.ilike."%+66900232123%"');
		expect(filter).toContain('phone.ilike."%900232123%"');
	});

	it('searches name and email for non-phone queries', () => {
		const filter = buildProfileSearchOrFilter('player@test.com');
		expect(filter).toContain('email.ilike."%player@test.com%"');
		expect(filter).not.toContain('phone.ilike');
	});
});
