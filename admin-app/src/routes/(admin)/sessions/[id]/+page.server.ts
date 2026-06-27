import { resolveEffectiveAppRole } from '$lib/server/adminDashboardMode';
import { assertSuperAdmin } from '$lib/server/clubAccess';
import { loadSessionDetail } from '$lib/server/sessions';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({
	params,
	url,
	cookies,
	locals: { supabase, user, appRole }
}) => {
	if (!user || !appRole) {
		error(401, 'Sign in required');
	}

	const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
	const session = await loadSessionDetail(supabase, params.id);

	if (!session) {
		error(404, 'Session not found');
	}

	return {
		session,
		isSuperAdmin: effectiveAppRole === 'super_admin',
		isHost: session.host_id === user.id,
		created: url.searchParams.get('created') === '1'
	};
};

export const actions: Actions = {
	forceEnd: async ({ params, locals: { supabase, appRole } }) => {
		assertSuperAdmin(appRole);

		const { error: updateError } = await supabase
			.from('sessions')
			.update({ status: 'closed' })
			.eq('id', params.id);

		if (updateError) {
			console.error('Failed to force end session', updateError);
			return fail(500, { message: 'Could not force end session. Please try again.' });
		}

		return { success: true, message: 'Session force ended.' };
	}
};
