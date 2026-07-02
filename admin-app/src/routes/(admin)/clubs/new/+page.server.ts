import { tForLocale } from '$lib/i18n';
import { assertSuperAdmin } from '$lib/server/clubAccess';
import { CLUB_MAX_ACTIVE_SESSIONS_LIMIT, CLUB_MAX_ADMINS_LIMIT } from '$lib/server/clubLimits';
import { sanitizeRichText } from '$lib/server/sanitizeHtml';
import { buildClubInputSchema } from '$lib/validation/club';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals: { appRole } }) => {
	assertSuperAdmin(appRole);

	return {
		maxActiveSessionsLimit: CLUB_MAX_ACTIVE_SESSIONS_LIMIT,
		maxAdminsLimit: CLUB_MAX_ADMINS_LIMIT
	};
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase, user, appRole, locale } }) => {
		assertSuperAdmin(appRole);

		if (!user) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const formData = await request.formData();
		const parsed = buildClubInputSchema(locale).safeParse({
			name: formData.get('name'),
			description: formData.get('description') ?? '',
			max_active_sessions: formData.get('max_active_sessions'),
			max_admins: formData.get('max_admins'),
			is_active: formData.get('is_active') ?? 'true'
		});

		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				message: Object.values(fieldErrors).flat()[0] ?? tForLocale(locale, 'errors.invalidInput'),
				fieldErrors,
				values: {
					name: String(formData.get('name') ?? ''),
					description: String(formData.get('description') ?? ''),
					max_active_sessions: String(formData.get('max_active_sessions') ?? ''),
					max_admins: String(formData.get('max_admins') ?? ''),
					is_active: String(formData.get('is_active') ?? 'true')
				}
			});
		}

		const { data, error } = await supabase
			.from('clubs')
			.insert({
				name: parsed.data.name,
				description: sanitizeRichText(parsed.data.description),
				max_active_sessions: parsed.data.max_active_sessions,
				max_admins: parsed.data.max_admins,
				is_active: parsed.data.is_active,
				owner_id: user.id
			})
			.select('id')
			.single();

		if (error || !data) {
			console.error('Failed to create club', error);
			return fail(500, {
				message: tForLocale(locale, 'clubs.action.createFailed'),
				values: parsed.data
			});
		}

		redirect(303, `/clubs/${data.id}?created=1`);
	}
};
