import type { ClubPublic } from '$lib/types/club';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 10;

export const load: PageServerLoad = async ({ locals: { supabase }, url, depends }) => {
	depends('app:clubs');
	const rawPage = Number(url.searchParams.get('page') ?? 1);
	const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
	const from = (page - 1) * PAGE_SIZE;
	const to = from + PAGE_SIZE - 1;

	const { data, error, count } = await supabase
		.from('clubs')
		.select('id, name, description', { count: 'exact' })
		.eq('is_active', true)
		.order('name', { ascending: true })
		.range(from, to);

	if (error) {
		console.error('Failed to load clubs', error);
		return {
			clubs: [] as ClubPublic[],
			page: 1,
			pageSize: PAGE_SIZE,
			totalCount: 0,
			totalPages: 1
		};
	}

	const totalCount = count ?? 0;
	const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
	const safePage = Math.min(page, totalPages);

	return {
		clubs: (data ?? []) as ClubPublic[],
		page: safePage,
		pageSize: PAGE_SIZE,
		totalCount,
		totalPages
	};
};
