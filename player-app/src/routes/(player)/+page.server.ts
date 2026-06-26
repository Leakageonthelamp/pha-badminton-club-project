import type { ClubPublic } from '$lib/types/club';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, depends }) => {
	depends('app:clubs');

	const { data, error } = await supabase
		.from('clubs')
		.select('id, name, description, latitude, longitude')
		.eq('is_active', true)
		.order('name', { ascending: true });

	if (error) {
		console.error('Failed to load clubs', error);
		return {
			clubs: [] as ClubPublic[]
		};
	}

	return {
		clubs: (data ?? []) as ClubPublic[]
	};
};
