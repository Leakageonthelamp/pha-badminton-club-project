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

	it('detects forward and back transition direction', () => {
		expect(getTransitionDirection('/login', '/register')).toBe('forward');
		expect(getTransitionDirection('/register', '/login')).toBe('back');
	});
});
