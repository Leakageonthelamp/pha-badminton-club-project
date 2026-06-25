import type { Club } from '$lib/types/club';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data, error } = await supabase
		.from('clubs')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Failed to load clubs', error);
		return { clubs: [] as Club[] };
	}

	return { clubs: (data ?? []) as Club[] };
};
