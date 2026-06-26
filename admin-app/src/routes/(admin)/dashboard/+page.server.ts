import {
	getDashboardModeFromCookies,
	getEffectiveAppRole,
	hasClubAdminMembership,
	sanitizeDashboardMode,
	shouldUseClubDashboard
} from '$lib/server/adminDashboardMode';
import { loadManagedClubs } from '$lib/server/clubAccess';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({
	cookies,
	locals: { supabase, user, appRole }
}) => {
	if (!user || !appRole) {
		return { clubs: [], profileName: '' };
	}

	const hasClubMembership =
		appRole === 'super_admin' ? await hasClubAdminMembership(supabase, user.id) : false;
	let dashboardMode = getDashboardModeFromCookies(cookies);

	if (appRole === 'super_admin') {
		dashboardMode = sanitizeDashboardMode(appRole, dashboardMode, hasClubMembership, cookies);
	}

	if (!shouldUseClubDashboard(appRole, dashboardMode, hasClubMembership)) {
		redirect(303, '/');
	}

	const effectiveAppRole = getEffectiveAppRole(appRole, dashboardMode, hasClubMembership);
	const clubs = await loadManagedClubs(supabase, user.id, effectiveAppRole);

	const { data: profile } = await supabase
		.from('profiles')
		.select('display_name')
		.eq('id', user.id)
		.single();

	return {
		clubs,
		profileName: profile?.display_name ?? 'Club admin'
	};
};
