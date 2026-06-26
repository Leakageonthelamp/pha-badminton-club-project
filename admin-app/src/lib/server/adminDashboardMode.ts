import {
	type AdminWorkspaceId,
	getAvailableWorkspaceIds,
	getEffectiveAppRoleForWorkspace,
	getWorkspaceHomePath,
	parseWorkspaceId,
	sanitizeWorkspaceId,
	shouldUseClubDashboard as shouldUseClubWorkspace
} from '$lib/adminWorkspace';
import type { AppRole } from '$lib/types/auth';
import { SESSION_MAX_AGE } from '$lib/types/auth';
import type { Cookies } from '@sveltejs/kit';

export type AdminDashboardMode = AdminWorkspaceId;

export const ADMIN_DASHBOARD_MODE_COOKIE = 'admin_dashboard_mode';

export const parseDashboardMode = (value: string | undefined): AdminWorkspaceId =>
	parseWorkspaceId(value);

export const getDashboardModeFromCookies = (cookies: Cookies): AdminWorkspaceId =>
	parseWorkspaceId(cookies.get(ADMIN_DASHBOARD_MODE_COOKIE));

export const setDashboardModeCookie = (cookies: Cookies, mode: AdminWorkspaceId) => {
	cookies.set(ADMIN_DASHBOARD_MODE_COOKIE, mode, {
		path: '/',
		maxAge: SESSION_MAX_AGE,
		httpOnly: true,
		sameSite: 'lax'
	});
};

export const canSwitchDashboardMode = (appRole: AppRole | null, hasMembership: boolean): boolean =>
	appRole !== null && getAvailableWorkspaceIds(appRole, hasMembership).length > 1;

export const getEffectiveAppRole = (
	appRole: AppRole,
	mode: AdminWorkspaceId,
	hasMembership: boolean
): AppRole => getEffectiveAppRoleForWorkspace(appRole, mode, hasMembership);

export const hasClubAdminMembership = async (
	supabase: App.Locals['supabase'],
	userId: string
): Promise<boolean> => {
	const { count, error } = await supabase
		.from('club_admins')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', userId);

	if (error) {
		console.error('Failed to check club admin membership', error);
		return false;
	}

	return (count ?? 0) > 0;
};

export const resolveEffectiveAppRole = async (
	supabase: App.Locals['supabase'],
	userId: string,
	appRole: AppRole,
	cookies: Cookies
): Promise<{
	effectiveAppRole: AppRole;
	hasClubMembership: boolean;
	dashboardMode: AdminWorkspaceId;
}> => {
	const hasClubMembership =
		appRole === 'super_admin' ? await hasClubAdminMembership(supabase, userId) : false;
	const dashboardMode = getDashboardModeFromCookies(cookies);
	const effectiveAppRole = getEffectiveAppRole(appRole, dashboardMode, hasClubMembership);

	return { effectiveAppRole, hasClubMembership, dashboardMode };
};

export const getLoginHomePath = (
	appRole: AppRole,
	mode: AdminWorkspaceId,
	hasMembership: boolean
): string => {
	if (shouldUseClubDashboard(appRole, mode, hasMembership)) {
		return '/dashboard';
	}

	return '/';
};

export const shouldUseClubDashboard = (
	appRole: AppRole,
	mode: AdminWorkspaceId,
	hasMembership: boolean
): boolean => shouldUseClubWorkspace(appRole, mode, hasMembership);

export const sanitizeDashboardMode = (
	appRole: AppRole,
	mode: AdminWorkspaceId,
	hasMembership: boolean,
	cookies: Cookies
): AdminWorkspaceId => {
	const sanitized = sanitizeWorkspaceId(appRole, mode, hasMembership);

	if (sanitized !== mode) {
		setDashboardModeCookie(cookies, sanitized);
	}

	return sanitized;
};

export const resolveWorkspaceForRole = (
	appRole: AppRole,
	requestedMode: AdminWorkspaceId,
	hasMembership: boolean
): AdminWorkspaceId => {
	const allowed = getAvailableWorkspaceIds(appRole, hasMembership);
	return allowed.includes(requestedMode) ? requestedMode : allowed[0] ?? 'super';
};

export const getHomePathForWorkspace = (workspaceId: AdminWorkspaceId): string =>
	getWorkspaceHomePath(workspaceId);
