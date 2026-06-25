import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { supabase, session, user } }) => {
	if (!session || !user) {
		redirect(303, '/login');
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('display_name, avatar_url, tag')
		.eq('id', user.id)
		.single();

	return {
		profile: profile ?? {
			display_name: user.email?.split('@')[0] ?? 'Player',
			avatar_url: null,
			tag: null
		}
	};
};
