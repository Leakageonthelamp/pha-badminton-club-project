import '$lib/i18n';
import { describe, expect, it } from 'vitest';
import {
	canSwitchWorkspace,
	getAvailableWorkspaceIds,
	getWorkspaceOptions,
	parseWorkspaceId,
	sanitizeWorkspaceId
} from './adminWorkspace';

describe('adminWorkspace', () => {
	it('lists workspaces per app role', () => {
		expect(getAvailableWorkspaceIds('club_admin', false)).toEqual(['club']);
		expect(getAvailableWorkspaceIds('super_admin', false)).toEqual(['super']);
		expect(getAvailableWorkspaceIds('super_admin', true)).toEqual(['super', 'club']);
	});

	it('canSwitchWorkspace when more than one option', () => {
		expect(canSwitchWorkspace(['super'])).toBe(false);
		expect(canSwitchWorkspace(['super', 'club'])).toBe(true);
	});

	it('parseWorkspaceId falls back safely', () => {
		expect(parseWorkspaceId('club')).toBe('club');
		expect(parseWorkspaceId('unknown')).toBe('super');
	});

	it('sanitizeWorkspaceId picks first allowed workspace', () => {
		expect(sanitizeWorkspaceId('super_admin', 'club', false)).toBe('super');
		expect(sanitizeWorkspaceId('super_admin', 'club', true)).toBe('club');
	});

	it('getWorkspaceOptions maps registry entries', () => {
		const options = getWorkspaceOptions('super_admin', true, 'en');
		expect(options.map((o) => o.id)).toEqual(['super', 'club']);
		expect(options[0]?.label).toBe('Super admin');
	});
});
