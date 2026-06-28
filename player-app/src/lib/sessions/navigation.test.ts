import { describe, expect, it } from 'vitest';
import { liveSessionHref, shouldOpenLiveSession } from './navigation';
import type { SessionListItem } from '$lib/types/session';

const session = (
	overrides: Partial<SessionListItem>
): SessionListItem =>
	({
		id: 's1',
		status: 'open',
		my_membership: null,
		...overrides
	}) as SessionListItem;

describe('shouldOpenLiveSession', () => {
	it('returns true for joined in_progress sessions', () => {
		expect(
			shouldOpenLiveSession(
				session({
					status: 'in_progress',
					my_membership: {
						id: 'm1',
						status: 'confirmed',
						fee_owed: 0, fee_status: 'none',
						joined_at: '2026-06-01T00:00:00.000Z'
					}
				})
			)
		).toBe(true);
	});

	it('returns false for open sessions or non-members', () => {
		expect(shouldOpenLiveSession(session({ status: 'open' }))).toBe(false);
		expect(
			shouldOpenLiveSession(
				session({
					status: 'in_progress',
					my_membership: null
				})
			)
		).toBe(false);
	});
});

describe('liveSessionHref', () => {
	it('builds the live session route', () => {
		expect(liveSessionHref('abc-123')).toBe('/sessions/abc-123/live');
	});
});
