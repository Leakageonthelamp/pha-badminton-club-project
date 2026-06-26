import type { AdminDashboardMode } from '$lib/server/adminDashboardMode';
import type { AppRole } from '$lib/types/auth';

/** Paths that never show a back arrow. */
const AUTH_PATHS = new Set(['/login']);

export const getHomePath = (
	appRole?: AppRole | null,
	dashboardMode?: AdminDashboardMode,
	hasClubMembership?: boolean
): string => {
	if (appRole === 'club_admin') {
		return '/dashboard';
	}

	if (appRole === 'super_admin' && dashboardMode === 'club' && hasClubMembership) {
		return '/dashboard';
	}

	return '/';
};

export const shouldShowBack = (
	pathname: string,
	appRole?: AppRole | null,
	dashboardMode?: AdminDashboardMode,
	hasClubMembership?: boolean
): boolean => {
	if (AUTH_PATHS.has(pathname) || pathname.startsWith('/auth/callback')) {
		return false;
	}

	return pathname !== getHomePath(appRole, dashboardMode, hasClubMembership);
};

export const getBackHref = (
	pathname: string,
	appRole?: AppRole | null,
	dashboardMode?: AdminDashboardMode,
	hasClubMembership?: boolean
): string => {
	const home = getHomePath(appRole, dashboardMode, hasClubMembership);

	if (pathname === '/clubs/new' || pathname === '/profile' || pathname === '/users') {
		return home;
	}

	if (pathname.startsWith('/clubs/') && pathname !== '/clubs/new') {
		return home;
	}

	const segments = pathname.split('/').filter(Boolean);
	if (segments.length > 1) {
		return `/${segments.slice(0, -1).join('/')}`;
	}

	return home;
};

/** Super-admin home ↔ club dashboard when switching workspace. */
export const isWorkspaceHomeSwitch = (fromPath: string, toPath: string): boolean =>
	(fromPath === '/' && toPath === '/dashboard') || (fromPath === '/dashboard' && toPath === '/');

export const getTransitionDirection = (
	fromPath: string | undefined,
	toPath: string,
	appRole?: AppRole | null,
	dashboardMode?: AdminDashboardMode,
	hasClubMembership?: boolean
): 'forward' | 'back' => {
	if (!fromPath) {
		return 'forward';
	}

	if (isWorkspaceHomeSwitch(fromPath, toPath)) {
		return toPath === '/dashboard' ? 'forward' : 'back';
	}

	if (getBackHref(fromPath, appRole, dashboardMode, hasClubMembership) === toPath) {
		return 'back';
	}

	return 'forward';
};
