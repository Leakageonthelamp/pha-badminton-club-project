import type { AppRole } from '$lib/types/auth';

/** Paths that never show a back arrow. */
const AUTH_PATHS = new Set(['/login']);

export const getHomePath = (appRole?: AppRole | null): string =>
	appRole === 'club_admin' ? '/dashboard' : '/';

export const shouldShowBack = (pathname: string, appRole?: AppRole | null): boolean => {
	if (AUTH_PATHS.has(pathname) || pathname.startsWith('/auth/callback')) {
		return false;
	}

	return pathname !== getHomePath(appRole);
};

export const getBackHref = (pathname: string, appRole?: AppRole | null): string => {
	const home = getHomePath(appRole);

	if (pathname === '/clubs/new' || pathname === '/profile') {
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

export const getTransitionDirection = (
	fromPath: string | undefined,
	toPath: string,
	appRole?: AppRole | null
): 'forward' | 'back' => {
	if (!fromPath) {
		return 'forward';
	}

	if (getBackHref(fromPath, appRole) === toPath) {
		return 'back';
	}

	return 'forward';
};
