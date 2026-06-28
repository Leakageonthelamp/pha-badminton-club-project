import { resolveEffectiveAppRole } from '$lib/server/adminDashboardMode';
import { loadManagedClubs } from '$lib/server/clubAccess';
import { loadSessionsForAdmin, sweepOverdueDraftSessions } from '$lib/server/sessions';
import { filterActiveSessions } from '$lib/sessions/list';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({
	cookies,
	locals: { supabase, user, appRole }
}) => {
	if (!user || !appRole) {
		error(401, 'Sign in required');
	}

	const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
	const isSuperAdmin = effectiveAppRole === 'super_admin';
	const managedClubs = isSuperAdmin ? [] : await loadManagedClubs(supabase, user.id, effectiveAppRole);
	const clubIds = managedClubs.map((club) => club.id);

	await sweepOverdueDraftSessions(supabase, isSuperAdmin ? undefined : { clubIds });

	const sessions = await loadSessionsForAdmin(supabase, {
		appRole: effectiveAppRole,
		userId: user.id,
		clubIds: isSuperAdmin ? undefined : clubIds
	});

	return {
		sessions: filterActiveSessions(sessions),
		isSuperAdmin,
		effectiveAppRole,
		userId: user.id,
		managedClubs
	};
};
