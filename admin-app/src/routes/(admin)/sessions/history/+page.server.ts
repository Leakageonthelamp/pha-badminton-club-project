import { tForLocale } from '$lib/i18n';
import { resolveEffectiveAppRole } from '$lib/server/adminDashboardMode';
import { loadManagedClubs } from '$lib/server/clubAccess';
import { loadOutstandingCancellationFeeCountsBySession } from '$lib/server/sessionPlayers';
import { loadSessionsForAdmin } from '$lib/server/sessions';
import { filterHistorySessions } from '$lib/sessions/list';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({
	cookies,
	locals: { supabase, user, appRole, locale }
}) => {
	if (!user || !appRole) {
		error(401, tForLocale(locale, 'auth.error.signInRequired'));
	}

	const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
	const isSuperAdmin = effectiveAppRole === 'super_admin';
	const managedClubs = isSuperAdmin ? [] : await loadManagedClubs(supabase, user.id, effectiveAppRole);
	const clubIds = managedClubs.map((club) => club.id);
	const sessions = await loadSessionsForAdmin(supabase, {
		appRole: effectiveAppRole,
		userId: user.id,
		clubIds: isSuperAdmin ? undefined : clubIds
	});

	const historySessions = filterHistorySessions(sessions);
	const outstandingCancellationFeesBySession = await loadOutstandingCancellationFeeCountsBySession(
		supabase,
		historySessions.map((session) => session.id)
	);

	return {
		historySessions,
		outstandingCancellationFeesBySession,
		isSuperAdmin,
		effectiveAppRole,
		userId: user.id,
		managedClubs
	};
};
