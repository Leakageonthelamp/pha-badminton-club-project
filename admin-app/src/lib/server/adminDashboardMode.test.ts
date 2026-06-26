import { describe, expect, it } from 'vitest';
import {
	canSwitchDashboardMode,
	getEffectiveAppRole,
	getLoginHomePath,
	parseDashboardMode,
	shouldUseClubDashboard
} from './adminDashboardMode';

describe('adminDashboardMode', () => {
	it('parseDashboardMode defaults to super', () => {
		expect(parseDashboardMode(undefined)).toBe('super');
		expect(parseDashboardMode('club')).toBe('club');
	});

	it('getEffectiveAppRole uses club_admin in club mode for dual-role super admin', () => {
		expect(getEffectiveAppRole('super_admin', 'club', true)).toBe('club_admin');
		expect(getEffectiveAppRole('super_admin', 'club', false)).toBe('super_admin');
		expect(getEffectiveAppRole('super_admin', 'super', true)).toBe('super_admin');
		expect(getEffectiveAppRole('club_admin', 'club', true)).toBe('club_admin');
	});

	it('shouldUseClubDashboard gates club dashboard access', () => {
		expect(shouldUseClubDashboard('club_admin', 'super', false)).toBe(true);
		expect(shouldUseClubDashboard('super_admin', 'club', true)).toBe(true);
		expect(shouldUseClubDashboard('super_admin', 'club', false)).toBe(false);
		expect(shouldUseClubDashboard('super_admin', 'super', true)).toBe(false);
	});

	it('canSwitchDashboardMode only for super admin with membership', () => {
		expect(canSwitchDashboardMode('super_admin', true)).toBe(true);
		expect(canSwitchDashboardMode('super_admin', false)).toBe(false);
		expect(canSwitchDashboardMode('club_admin', true)).toBe(false);
	});

	it('getLoginHomePath respects dashboard mode', () => {
		expect(getLoginHomePath('club_admin', 'super', false)).toBe('/dashboard');
		expect(getLoginHomePath('super_admin', 'club', true)).toBe('/dashboard');
		expect(getLoginHomePath('super_admin', 'super', true)).toBe('/');
	});
});
