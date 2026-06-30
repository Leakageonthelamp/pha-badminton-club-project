import { loadMatchHistoryForPlayer } from '$lib/server/matches';
import {
	parseHistoryDate,
	parseHistoryPage,
	parseResultFilter
} from '$lib/matches/history';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals: { supabase, user }, depends }) => {
	depends('app:match-history');

	if (!user) {
		error(401, 'Sign in required');
	}

	const history = await loadMatchHistoryForPlayer(supabase, user.id, {
		page: parseHistoryPage(url.searchParams.get('mPage')),
		resultFilter: parseResultFilter(url.searchParams.get('mResult')),
		sessionFilter: url.searchParams.get('mSession') ?? undefined,
		date: parseHistoryDate(url.searchParams.get('mDate'))
	});

	return { history, userId: user.id };
};
