import { tForLocale } from '$lib/i18n';
import { assertSuperAdmin } from '$lib/server/clubAccess';
import {
	assertCallerCanManageUser,
	banUser,
	countOwnedClubs,
	deleteUser,
	loadAuthUserSummary,
	loadProfileForManagement,
	resetUserPassword,
	unbanUser
} from '$lib/server/userManagement';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';

export type ManagedClub = {
	id: string;
	name: string;
};

export const load: PageServerLoad = async ({ params, locals: { supabase, appRole, locale } }) => {
	assertSuperAdmin(appRole);

	const profile = await loadProfileForManagement(supabase, params.id);

	if (!profile) {
		error(404, tForLocale(locale, 'errors.userNotFound'));
	}

	const { data: memberships, error: membershipError } = await supabase
		.from('club_admins')
		.select('club_id')
		.eq('user_id', params.id);

	if (membershipError) {
		console.error('Failed to load managed clubs', membershipError);
	}

	const clubIds = (memberships ?? []).map((row) => row.club_id);
	let managedClubs: ManagedClub[] = [];

	if (clubIds.length) {
		const { data: clubs, error: clubsError } = await supabase
			.from('clubs')
			.select('id, name')
			.in('id', clubIds)
			.order('name', { ascending: true });

		if (clubsError) {
			console.error('Failed to load club names', clubsError);
		} else {
			managedClubs = clubs ?? [];
		}
	}

	const { data: ownedClubs, error: ownedError } = await supabase
		.from('clubs')
		.select('id, name')
		.eq('owner_id', params.id)
		.order('name', { ascending: true });

	if (ownedError) {
		console.error('Failed to load owned clubs', ownedError);
	}

	const authSummary = await loadAuthUserSummary(params.id);
	const ownedClubCount = await countOwnedClubs(supabase, params.id);

	return {
		profile,
		managedClubs,
		ownedClubs: ownedClubs ?? [],
		ownedClubCount,
		authSummary
	};
};

const buildPasswordSchema = (locale: App.Locals['locale']) =>
	z.object({
		password: z.string().min(1, tForLocale(locale, 'users.action.passwordRequired'))
	});

const runCallerCheck = (
	appRole: App.Locals['appRole'],
	callerId: string,
	targetId: string
) => {
	const result = assertCallerCanManageUser(appRole, callerId, targetId);
	if (!result.ok) {
		return fail(403, { message: result.message });
	}

	return null;
};

export const actions: Actions = {
	resetPassword: async ({ request, params, locals: { supabase, user, appRole, locale } }) => {
		if (!user) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const callerFail = runCallerCheck(appRole, user.id, params.id);
		if (callerFail) {
			return callerFail;
		}

		const profile = await loadProfileForManagement(supabase, params.id);
		if (!profile) {
			return fail(404, { message: tForLocale(locale, 'errors.userNotFound') });
		}

		const formData = await request.formData();
		const parsed = buildPasswordSchema(locale).safeParse({ password: formData.get('password') });

		if (!parsed.success) {
			return fail(400, { message: tForLocale(locale, 'users.action.passwordRequired') });
		}

		const result = await resetUserPassword(
			params.id,
			parsed.data.password,
			profile.sign_in_method
		);

		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: tForLocale(locale, 'users.action.passwordSet') };
	},

	ban: async ({ params, locals: { user, appRole, locale } }) => {
		if (!user) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const callerFail = runCallerCheck(appRole, user.id, params.id);
		if (callerFail) {
			return callerFail;
		}

		const result = await banUser(params.id);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: tForLocale(locale, 'users.action.banned') };
	},

	unban: async ({ params, locals: { user, appRole, locale } }) => {
		if (!user) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const callerFail = runCallerCheck(appRole, user.id, params.id);
		if (callerFail) {
			return callerFail;
		}

		const result = await unbanUser(params.id);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		return { success: true, message: tForLocale(locale, 'users.action.unbanned') };
	},

	delete: async ({ request, params, locals: { supabase, user, appRole, locale } }) => {
		if (!user) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const callerFail = runCallerCheck(appRole, user.id, params.id);
		if (callerFail) {
			return callerFail;
		}

		const profile = await loadProfileForManagement(supabase, params.id);
		if (!profile) {
			return fail(404, { message: tForLocale(locale, 'errors.userNotFound') });
		}

		const formData = await request.formData();
		const confirmText = String(formData.get('confirmText') ?? '');

		const result = await deleteUser(supabase, params.id, confirmText, profile);
		if (!result.ok) {
			return fail(400, { message: result.message });
		}

		redirect(303, '/users');
	}
};
