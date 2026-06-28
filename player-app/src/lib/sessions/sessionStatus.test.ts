import { describe, expect, it } from 'vitest';
import {
	clampIdleSince,
	derivePlayerLiveStatus,
	idleSinceSortKey
} from '@repo/ui/sessionStatus';

describe('derivePlayerLiveStatus', () => {
	it('maps left membership to leave regardless of activity', () => {
		expect(
			derivePlayerLiveStatus({ membershipStatus: 'left', activity: 'idle' })
		).toBe('leave');
		expect(
			derivePlayerLiveStatus({ membershipStatus: 'left', activity: 'billing' })
		).toBe('leave');
	});

	it('maps confirmed membership by activity', () => {
		expect(
			derivePlayerLiveStatus({ membershipStatus: 'confirmed', activity: 'billing' })
		).toBe('billing');
		expect(
			derivePlayerLiveStatus({ membershipStatus: 'confirmed', activity: 'break' })
		).toBe('break');
		expect(
			derivePlayerLiveStatus({ membershipStatus: 'confirmed', activity: 'playing' })
		).toBe('playing');
		expect(
			derivePlayerLiveStatus({ membershipStatus: 'confirmed', activity: 'idle' })
		).toBe('idle');
	});
});

describe('clampIdleSince', () => {
	const sessionStart = '2026-06-29T10:00:00.000Z';

	it('returns null when idle_since is null', () => {
		expect(clampIdleSince(null, sessionStart)).toBeNull();
	});

	it('clamps pre-session idle_since to session start', () => {
		expect(clampIdleSince('2026-06-29T09:00:00.000Z', sessionStart)).toBe(sessionStart);
	});

	it('keeps idle_since at or after session start', () => {
		const afterStart = '2026-06-29T10:30:00.000Z';
		expect(clampIdleSince(afterStart, sessionStart)).toBe(afterStart);
	});
});

describe('idleSinceSortKey', () => {
	const sessionStart = '2026-06-29T10:00:00.000Z';

	it('sorts earlier idle time before later', () => {
		const early = idleSinceSortKey('2026-06-29T10:05:00.000Z', sessionStart);
		const late = idleSinceSortKey('2026-06-29T10:20:00.000Z', sessionStart);
		expect(early).toBeLessThan(late);
	});

	it('puts null idle_since last', () => {
		const withIdle = idleSinceSortKey('2026-06-29T10:05:00.000Z', sessionStart);
		const withoutIdle = idleSinceSortKey(null, sessionStart);
		expect(withIdle).toBeLessThan(withoutIdle);
	});
});
