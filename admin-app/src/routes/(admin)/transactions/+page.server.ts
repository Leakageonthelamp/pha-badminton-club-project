import { tForLocale } from '$lib/i18n';
import { resolveEffectiveAppRole } from '$lib/server/adminDashboardMode';
import { loadManagedClubs } from '$lib/server/clubAccess';
import { loadAdminTransactions } from '$lib/server/transactions';
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
	const transactions = await loadAdminTransactions(supabase, {
		clubIds: isSuperAdmin ? undefined : clubIds
	});

	return {
		transactions,
		isSuperAdmin,
		effectiveAppRole,
		userId: user.id,
		managedClubs
	};
};
