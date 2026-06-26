import { browser } from '$app/environment';
import { invalidateAll } from '$app/navigation';

const OAUTH_REFRESH_COOKIE = 'oauth_refresh=';

/** Clear cached loads after OAuth login (layout profile can lag behind the new session). */
export const refreshAuthCacheIfNeeded = (): void => {
	if (!browser || !document.cookie.includes(OAUTH_REFRESH_COOKIE)) return;

	document.cookie = 'oauth_refresh=; path=/; max-age=0; SameSite=Lax';
	void invalidateAll();
};

/** Per-user cache token so Google/Facebook switches do not reuse each other's profile. */
export const authLoadDepends = (userId: string | null | undefined, depends: (token: string) => void) => {
	depends(userId ? `app:user:${userId}` : 'app:auth');
};
