import {
	getDashboardModeFromCookies,
	hasClubAdminMembership,
	resolveEffectiveAppRole,
	sanitizeDashboardMode,
	shouldUseClubDashboard
} from '$lib/server/adminDashboardMode';
import { loadManagedClubs } from '$lib/server/clubAccess';
import { loadSessionsForAdmin, sweepOverdueDraftSessions } from '$lib/server/sessions';
import { filterUpcomingSessions } from '$lib/sessions/list';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({
	cookies,
	locals: { supabase, user, appRole }
}) => {
	if (!user || !appRole) {
		return { profileName: '', upcomingSessions: [], userId: '', canCreate: false };
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

	const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
	const managedClubs = await loadManagedClubs(supabase, user.id, effectiveAppRole);
	const clubIds = managedClubs.map((club) => club.id);

	await sweepOverdueDraftSessions(supabase, { clubIds });

	const sessions = await loadSessionsForAdmin(supabase, {
		appRole: effectiveAppRole,
		userId: user.id,
		clubIds
	});

	const { data: profile } = await supabase
		.from('profiles')
		.select('display_name')
		.eq('id', user.id)
		.single();

	return {
		profileName: profile?.display_name ?? 'Club admin',
		upcomingSessions: filterUpcomingSessions(sessions),
		userId: user.id,
		canCreate: effectiveAppRole === 'club_admin'
	};
};
