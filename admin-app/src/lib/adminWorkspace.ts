import type { Locale } from '@repo/ui/i18n';
import { DEFAULT_LOCALE } from '@repo/ui/i18n';
import { tForLocale } from '@repo/ui/i18n/i18n.svelte';
import type { AppRole } from '$lib/types/auth';

/** Extend this union when adding new admin workspaces. */
export const ADMIN_WORKSPACE_IDS = ['super', 'club'] as const;

export type AdminWorkspaceId = (typeof ADMIN_WORKSPACE_IDS)[number];

export type AdminWorkspaceOption = {
	id: AdminWorkspaceId;
	label: string;
	shortLabel: string;
	homePath: string;
};

const workspaceLabels = (locale: Locale): Record<AdminWorkspaceId, Omit<AdminWorkspaceOption, 'homePath'>> => ({
	super: {
		id: 'super',
		label: tForLocale(locale, 'workspace.super.label'),
		shortLabel: tForLocale(locale, 'workspace.super.shortLabel')
	},
	club: {
		id: 'club',
		label: tForLocale(locale, 'workspace.club.label'),
		shortLabel: tForLocale(locale, 'workspace.club.shortLabel')
	}
});

export const getAdminWorkspace = (
	id: AdminWorkspaceId,
	locale: Locale = DEFAULT_LOCALE
): AdminWorkspaceOption => ({
	...workspaceLabels(locale)[id],
	homePath: id === 'super' ? '/' : '/dashboard'
});

export const isAdminWorkspaceId = (value: string): value is AdminWorkspaceId =>
	ADMIN_WORKSPACE_IDS.includes(value as AdminWorkspaceId);

export const getAvailableWorkspaceIds = (
	appRole: AppRole,
	hasClubMembership: boolean
): AdminWorkspaceId[] => {
	if (appRole === 'club_admin') {
		return ['club'];
	}

	if (appRole === 'super_admin') {
		return hasClubMembership ? ['super', 'club'] : ['super'];
	}

	return [];
};

export const getWorkspaceOptions = (
	appRole: AppRole,
	hasClubMembership: boolean,
	locale: Locale = DEFAULT_LOCALE
): AdminWorkspaceOption[] =>
	getAvailableWorkspaceIds(appRole, hasClubMembership).map((id) => getAdminWorkspace(id, locale));

export const canSwitchWorkspace = (workspaceIds: AdminWorkspaceId[]): boolean =>
	workspaceIds.length > 1;

export const parseWorkspaceId = (
	value: string | undefined,
	fallback: AdminWorkspaceId = 'super'
): AdminWorkspaceId => {
	if (value && isAdminWorkspaceId(value)) {
		return value;
	}

	return fallback;
};

export const getWorkspaceHomePath = (workspaceId: AdminWorkspaceId): string =>
	getAdminWorkspace(workspaceId).homePath;

export const getEffectiveAppRoleForWorkspace = (
	appRole: AppRole,
	workspaceId: AdminWorkspaceId,
	hasClubMembership: boolean
): AppRole => {
	if (appRole === 'super_admin' && workspaceId === 'club' && hasClubMembership) {
		return 'club_admin';
	}

	return appRole;
};

export const shouldUseClubDashboard = (
	appRole: AppRole,
	workspaceId: AdminWorkspaceId,
	hasClubMembership: boolean
): boolean => {
	if (appRole === 'club_admin') {
		return true;
	}

	return appRole === 'super_admin' && workspaceId === 'club' && hasClubMembership;
};

export const sanitizeWorkspaceId = (
	appRole: AppRole,
	workspaceId: AdminWorkspaceId,
	hasClubMembership: boolean
): AdminWorkspaceId => {
	const allowed = getAvailableWorkspaceIds(appRole, hasClubMembership);

	if (allowed.includes(workspaceId)) {
		return workspaceId;
	}

	return allowed[0] ?? 'super';
};

/** @deprecated use getAdminWorkspace — kept for tests importing ADMIN_WORKSPACES */
export const ADMIN_WORKSPACES: Record<AdminWorkspaceId, AdminWorkspaceOption> = {
	super: getAdminWorkspace('super'),
	club: getAdminWorkspace('club')
};
