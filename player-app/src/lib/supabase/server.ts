import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Cookies } from '@sveltejs/kit';
import { SESSION_MAX_AGE } from '$lib/types/auth';

type CookieToSet = { name: string; value: string; options: CookieOptions };

export const createSupabaseServerClient = (cookies: Cookies) =>
	createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => cookies.getAll(),
			setAll: (cookiesToSet: CookieToSet[]) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					cookies.set(name, value, {
						...options,
						path: '/',
						maxAge: SESSION_MAX_AGE
					});
				});
			}
		},
		cookieOptions: {
			maxAge: SESSION_MAX_AGE,
			path: '/'
		}
	});

export const createSupabaseAdminClient = () => {
	const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!serviceRoleKey) {
		throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
	}

	return createClient(PUBLIC_SUPABASE_URL, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
};
