import { loadSessionHistoryForPlayer } from '$lib/server/sessions';
import {
	parseHistoryDate,
	parseHistoryPage,
	parseHistoryStatus
} from '$lib/sessions/history';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals: { supabase, user }, depends }) => {
	depends('app:session-history');

	if (!user) {
		error(401, 'Sign in required');
	}

	const history = await loadSessionHistoryForPlayer(supabase, user.id, {
		page: parseHistoryPage(url.searchParams.get('hPage')),
		statusFilter: parseHistoryStatus(url.searchParams.get('hStatus')),
		clubFilter: url.searchParams.get('hClub') ?? undefined,
		date: parseHistoryDate(url.searchParams.get('hDate'))
	});

	return { history };
};
