import { error } from '@sveltejs/kit';
import { authLoadDepends } from '$lib/navigation/authCache';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { supabase, user }, depends, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });

	if (!user) {
		return { profile: null };
	}

	authLoadDepends(user.id, depends);

	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('id, display_name, tag, avatar_url, app_role')
		.eq('id', user.id)
		.single();

	if (profileError || !profile) {
		error(500, 'Could not load profile');
	}

	return { profile };
};
