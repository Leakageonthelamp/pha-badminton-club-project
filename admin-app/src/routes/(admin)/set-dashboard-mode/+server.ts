import {
	getHomePathForWorkspace,
	hasClubAdminMembership,
	parseDashboardMode,
	resolveWorkspaceForRole,
	setDashboardModeCookie
} from '$lib/server/adminDashboardMode';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({
	request,
	cookies,
	locals: { supabase, user, appRole }
}) => {
	if (!user || !appRole) {
		redirect(303, '/login');
	}

	const formData = await request.formData();
	const requestedMode = parseDashboardMode(String(formData.get('mode') ?? ''));

	const hasClubMembership =
		appRole === 'super_admin' ? await hasClubAdminMembership(supabase, user.id) : false;

	const mode = resolveWorkspaceForRole(appRole, requestedMode, hasClubMembership);

	setDashboardModeCookie(cookies, mode);
	redirect(303, getHomePathForWorkspace(mode));
};
