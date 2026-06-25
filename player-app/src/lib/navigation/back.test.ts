import { describe, expect, it } from 'vitest';
import { getBackHref, getTransitionDirection, shouldShowBack } from '$lib/navigation/back';

describe('back navigation', () => {
	it('hides back on home routes', () => {
		expect(shouldShowBack('/')).toBe(false);
		expect(shouldShowBack('/login')).toBe(false);
		expect(shouldShowBack('/profile')).toBe(false);
	});

	it('shows back on secondary routes', () => {
		expect(shouldShowBack('/register')).toBe(true);
	});

	it('resolves register back to login', () => {
		expect(getBackHref('/register')).toBe('/login');
	});

	it('falls back to parent path for nested routes', () => {
		expect(getBackHref('/profile/settings')).toBe('/profile');
	});

	it('detects forward and back transition direction', () => {
		expect(getTransitionDirection('/login', '/register')).toBe('forward');
		expect(getTransitionDirection('/register', '/login')).toBe('back');
	});
});
