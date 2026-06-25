import { createSupabaseServerClient } from '$lib/supabase/server';
import {
	isSupabaseUnavailableError,
	markServiceUnavailable
} from '$lib/server/supabaseHealth';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { type Handle, redirect, type HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const supabaseHandle: Handle = async ({ event, resolve }) => {
	event.locals.serviceUnavailable = false;
	event.locals.supabase = createSupabaseServerClient(event.cookies);

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
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	if (event.locals.serviceUnavailable) {
		return resolve(event);
	}

	const path = event.url.pathname;
	const isProtectedRoute = path === '/' || path.startsWith('/profile');
	const isAuthRoute = path === '/login' || path === '/register';

	if (isProtectedRoute && !session) {
		redirect(303, '/login');
	}

	if (isAuthRoute && session) {
		redirect(303, '/');
	}

	if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
		console.warn('Supabase env vars are missing. Copy .env.example to .env and fill in your keys.');
	}

	return resolve(event);
};

export const handleError: HandleServerError = ({ error, status }) => {
	if (isSupabaseUnavailableError(error)) {
		return {
			message: 'Backend services are temporarily unavailable. Please try again later.',
			code: 'SERVICE_UNAVAILABLE'
		};
	}

	console.error('Unhandled server error', error);

	return {
		message: status === 404 ? 'Page not found' : 'Something went wrong. Please try again later.'
	};
};

export const handle = sequence(supabaseHandle, authGuard);
