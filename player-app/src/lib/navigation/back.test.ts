import { describe, expect, it } from 'vitest';
import { getBackHref, getTransitionDirection, shouldShowBack } from '$lib/navigation/back';

describe('back navigation', () => {
	it('hides back on home routes', () => {
		expect(shouldShowBack('/')).toBe(false);
		expect(shouldShowBack('/login')).toBe(false);
	});

	it('shows back on profile', () => {
		expect(shouldShowBack('/profile')).toBe(true);
	});

	it('shows back on secondary routes', () => {
		expect(shouldShowBack('/register')).toBe(true);
	});

	it('resolves register back to login', () => {
		expect(getBackHref('/register')).toBe('/login');
	});

	it('resolves profile back to home', () => {
		expect(getBackHref('/profile')).toBe('/');
	});

	it('resolves live session back to dashboard (no session detail route)', () => {
		expect(getBackHref('/sessions/f9b2b4d6-5fa9-4183-90d2-6beb26af4429/live')).toBe('/');
	});

	it('resolves closed live session back to session history', () => {
		expect(
			getBackHref('/sessions/f9b2b4d6-5fa9-4183-90d2-6beb26af4429/live', {
				liveSessionStatus: 'closed'
			})
		).toBe('/sessions/history');
	});

	it('resolves session history back to sessions list', () => {
		expect(getBackHref('/sessions/history')).toBe('/sessions');
	});

	it('detects forward and back transition direction', () => {
		expect(getTransitionDirection('/login', '/register')).toBe('forward');
		expect(getTransitionDirection('/register', '/login')).toBe('back');
	});
});
