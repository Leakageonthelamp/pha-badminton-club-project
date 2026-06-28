/** Paths that act as app home — no back arrow shown. */
export const HOME_PATHS = new Set(['/', '/login']);

const BACK_HREF: Record<string, string> = {
	'/register': '/login',
	'/profile': '/',
	'/sessions': '/'
};

export const shouldShowBack = (pathname: string): boolean => !HOME_PATHS.has(pathname);

export const getBackHref = (pathname: string): string => {
	if (BACK_HREF[pathname]) {
		return BACK_HREF[pathname];
	}

	const segments = pathname.split('/').filter(Boolean);
	if (segments.length > 1) {
		return `/${segments.slice(0, -1).join('/')}`;
	}

	return '/';
};

export const getTransitionDirection = (
	fromPath: string | undefined,
	toPath: string
): 'forward' | 'back' => {
	if (!fromPath) {
		return 'forward';
	}

	if (getBackHref(fromPath) === toPath) {
		return 'back';
	}

	return 'forward';
};
