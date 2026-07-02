import { isSupabaseUnavailableError } from '$lib/server/supabaseHealth';
import { authLoadDepends } from '$lib/navigation/authCache';
import { tForLocale } from '@repo/ui/i18n';
import { redirect, error as kitError } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, depends, setHeaders }) => {
	const { supabase, session, user, serviceUnavailable, locale } = locals;

	setHeaders({ 'cache-control': 'private, no-store' });

	if (serviceUnavailable) {
		return { profile: null };
	}

	if (!session || !user) {
		redirect(303, '/login');
	}

	authLoadDepends(user.id, depends);

	try {
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('id, display_name, avatar_url, tag')
			.eq('id', user.id)
			.single();

		if (profileError && isSupabaseUnavailableError(profileError)) {
			kitError(503, {
				message: tForLocale(locale, 'errors.backendUnavailable'),
				code: 'SERVICE_UNAVAILABLE'
			});
		}

		return {
			profile: profile ?? {
				id: user.id,
				display_name: user.email?.split('@')[0] ?? 'Player',
				avatar_url: null,
				tag: null
			}
		};
	} catch (caught) {
		if (isSupabaseUnavailableError(caught)) {
			kitError(503, {
				message: tForLocale(locale, 'errors.backendUnavailable'),
				code: 'SERVICE_UNAVAILABLE'
			});
		}

		throw caught;
	}
};
