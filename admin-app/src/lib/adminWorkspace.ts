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

export const ADMIN_WORKSPACES: Record<AdminWorkspaceId, AdminWorkspaceOption> = {
	super: {
		id: 'super',
		label: 'Super admin',
		shortLabel: 'Super',
		homePath: '/'
	},
	club: {
		id: 'club',
		label: 'Club admin',
		shortLabel: 'Club',
		homePath: '/dashboard'
	}
};

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
	hasClubMembership: boolean
): AdminWorkspaceOption[] =>
	getAvailableWorkspaceIds(appRole, hasClubMembership).map((id) => ADMIN_WORKSPACES[id]);

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
	ADMIN_WORKSPACES[workspaceId].homePath;

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
