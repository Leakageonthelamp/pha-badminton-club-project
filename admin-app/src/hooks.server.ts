import {
	getDashboardModeFromCookies,
	getLoginHomePath,
	hasClubAdminMembership,
	sanitizeDashboardMode,
	shouldUseClubDashboard
} from '$lib/server/adminDashboardMode';
import { isAdminAppRole } from '$lib/server/clubAccess';
import { createSupabaseServerClient } from '$lib/supabase/server';
import {
	isSupabaseUnavailableError,
	markServiceUnavailable
} from '$lib/server/supabaseHealth';
import type { AppRole } from '$lib/types/auth';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import '$lib/i18n';
import { tForLocale } from '$lib/i18n';
import { localeHandle } from '@repo/ui/i18n';
import { type Handle, redirect, type HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const PUBLIC_PATHS = new Set(['/login', '/auth/callback']);
const BACKDOOR_PATH = '/api/internal/promote-superadmin';
const SUPER_ADMIN_ONLY_PREFIXES = ['/clubs/new', '/users'];

const isPublicPath = (path: string) =>
	PUBLIC_PATHS.has(path) || path.startsWith('/auth/callback');

const loadAppRole = async (
	supabase: App.Locals['supabase'],
	userId: string
): Promise<AppRole | null> => {
	const { data, error } = await supabase
		.from('profiles')
		.select('app_role')
		.eq('id', userId)
		.single();

	if (error || !data?.app_role) {
		return null;
	}

	return data.app_role as AppRole;
};

const supabaseHandle: Handle = async ({ event, resolve }) => {
	event.locals.serviceUnavailable = false;
	event.locals.supabase = createSupabaseServerClient(event.cookies);
	event.locals.appRole = null;

	event.locals.safeGetSession = async () => {
		try {
			const {
				data: { session },
				error: sessionError
			} = await event.locals.supabase.auth.getSession();

			if (sessionError) {
				if (isSupabaseUnavailableError(sessionError)) {
					markServiceUnavailable(event.locals);
				}

				return { session: null, user: null };
			}

			if (!session) {
				return { session: null, user: null };
			}

			const {
				data: { user },
				error: userError
			} = await event.locals.supabase.auth.getUser();

			if (userError) {
				if (isSupabaseUnavailableError(userError)) {
					markServiceUnavailable(event.locals);
				}

				return { session: null, user: null };
			}

			return { session, user };
		} catch (error) {
			if (isSupabaseUnavailableError(error)) {
				markServiceUnavailable(event.locals);
			}

			return { session: null, user: null };
		}
	};

	return resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
};

const authGuard: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	const isBackdoor = path === BACKDOOR_PATH;
	const isPublic = isPublicPath(path);

	if (isBackdoor) {
		return resolve(event);
	}

	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	if (event.locals.serviceUnavailable) {
		return resolve(event);
	}

	if (session && user) {
		event.locals.appRole = await loadAppRole(event.locals.supabase, user.id);
		let dashboardMode = getDashboardModeFromCookies(event.cookies);
		const hasClubMembership =
			event.locals.appRole === 'super_admin'
				? await hasClubAdminMembership(event.locals.supabase, user.id)
				: false;

		if (event.locals.appRole === 'super_admin') {
			dashboardMode = sanitizeDashboardMode(
				event.locals.appRole,
				dashboardMode,
				hasClubMembership,
				event.cookies
			);
		}

		if (path === '/login') {
			if (isAdminAppRole(event.locals.appRole)) {
				redirect(
					303,
					getLoginHomePath(event.locals.appRole!, dashboardMode, hasClubMembership)
				);
			}

			await event.locals.supabase.auth.signOut();
			event.locals.session = null;
			event.locals.user = null;
			event.locals.appRole = null;
		} else if (!isPublic && !isAdminAppRole(event.locals.appRole)) {
			await event.locals.supabase.auth.signOut();
			redirect(303, '/login?error=access_denied');
		} else if (!isPublic && event.locals.appRole === 'club_admin' && path === '/') {
			redirect(303, '/dashboard');
		} else if (
			!isPublic &&
			event.locals.appRole === 'super_admin' &&
			dashboardMode === 'club' &&
			hasClubMembership &&
			path === '/'
		) {
			redirect(303, '/dashboard');
		} else if (
			!isPublic &&
			event.locals.appRole === 'super_admin' &&
			path === '/dashboard' &&
			!shouldUseClubDashboard(event.locals.appRole, dashboardMode, hasClubMembership)
		) {
			redirect(303, '/');
		} else if (
			!isPublic &&
			event.locals.appRole === 'club_admin' &&
			SUPER_ADMIN_ONLY_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
		) {
			redirect(303, '/dashboard');
		} else if (
			!isPublic &&
			event.locals.appRole === 'super_admin' &&
			dashboardMode === 'club' &&
			hasClubMembership &&
			SUPER_ADMIN_ONLY_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
		) {
			redirect(303, '/dashboard');
		}
	} else if (!isPublic) {
		redirect(303, '/login');
	}

	if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
		console.warn('Supabase env vars are missing. Copy .env.example to .env and fill in your keys.');
	}

	return resolve(event);
};

export const handleError: HandleServerError = ({ error, status, event }) => {
	const locale = event.locals.locale ?? 'th';

	if (isSupabaseUnavailableError(error)) {
		return {
			message: tForLocale(locale, 'error.serviceUnavailable.message'),
			code: 'SERVICE_UNAVAILABLE'
		};
	}

	console.error('Unhandled server error', error);

	return {
		message:
			status === 404
				? tForLocale(locale, 'error.notFound.message')
				: tForLocale(locale, 'error.generic.message')
	};
};

export const handle = sequence(localeHandle, supabaseHandle, authGuard);
