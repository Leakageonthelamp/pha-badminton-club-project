import {
	getWorkspaceOptions,
	type AdminWorkspaceId
} from '$lib/adminWorkspace';
import {
	canSwitchDashboardMode,
	getDashboardModeFromCookies,
	getEffectiveAppRole,
	hasClubAdminMembership,
	sanitizeDashboardMode,
	shouldUseClubDashboard
} from '$lib/server/adminDashboardMode';
import { loadManagedClubs } from '$lib/server/clubAccess';
import { authLoadDepends } from '$lib/navigation/authCache';
import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({
	locals: { supabase, user, appRole },
	cookies,
	depends,
	setHeaders
}) => {
	setHeaders({ 'cache-control': 'private, no-store' });

	if (!user || !appRole) {
		return {
			profile: null,
			dashboardMode: 'super' as AdminWorkspaceId,
			hasClubMembership: false,
			workspaceOptions: [],
			canSwitchWorkspace: false,
			effectiveAppRole: null,
			managedClubs: []
		};
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

	const hasClubMembership =
		appRole === 'super_admin' ? await hasClubAdminMembership(supabase, user.id) : false;
	let dashboardMode = getDashboardModeFromCookies(cookies);

	if (appRole === 'super_admin') {
		dashboardMode = sanitizeDashboardMode(appRole, dashboardMode, hasClubMembership, cookies);
	}

	const workspaceOptions = getWorkspaceOptions(appRole, hasClubMembership);
	const effectiveAppRole = getEffectiveAppRole(appRole, dashboardMode, hasClubMembership);
	const inClubWorkspace = shouldUseClubDashboard(appRole, dashboardMode, hasClubMembership);
	const managedClubs = inClubWorkspace
		? await loadManagedClubs(supabase, user.id, effectiveAppRole)
		: [];

	return {
		profile,
		dashboardMode,
		hasClubMembership,
		workspaceOptions,
		canSwitchWorkspace: canSwitchDashboardMode(appRole, hasClubMembership),
		effectiveAppRole,
		managedClubs
	};
};
