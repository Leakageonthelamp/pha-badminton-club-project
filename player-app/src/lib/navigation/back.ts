/** Paths that act as app home — no back arrow shown. */
export const HOME_PATHS = new Set(['/', '/login']);

const BACK_HREF: Record<string, string> = {
	'/register': '/login',
	'/profile': '/',
	'/sessions': '/',
	'/sessions/history': '/sessions'
};

const LIVE_SESSION_PATH = /^\/sessions\/[^/]+\/live$/;

type BackContext = {
	liveSessionStatus?: 'draft' | 'open' | 'in_progress' | 'closed' | 'cancelled';
};

export const shouldShowBack = (pathname: string): boolean => !HOME_PATHS.has(pathname);

export const getBackHref = (pathname: string, context?: BackContext): string => {
	if (BACK_HREF[pathname]) {
		return BACK_HREF[pathname];
	}

	// ponytail: player live page has no /sessions/[id] parent route
	if (LIVE_SESSION_PATH.test(pathname)) {
		if (context?.liveSessionStatus === 'closed') {
			return '/sessions/history';
		}
		return '/';
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
