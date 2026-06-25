import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) {
		return { profile: null };
	}

	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('display_name, tag, avatar_url, app_role')
		.eq('id', user.id)
		.single();

	if (profileError || !profile) {
		error(500, 'Could not load profile');
	}

	return { profile };
};
