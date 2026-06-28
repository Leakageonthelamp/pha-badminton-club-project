import { resolveEffectiveAppRole } from '$lib/server/adminDashboardMode';
import { assertCanManageClub, loadManagedClubs } from '$lib/server/clubAccess';
import {
	loadSessionDetail,
	loadShuttlesForClubs,
	releaseActiveSessionPlayers
} from '$lib/server/sessions';
import { sanitizeRichText } from '$lib/server/sanitizeHtml';
import { isSessionMutable } from '$lib/sessions/list';
import { buildSessionInputSchema } from '$lib/validation/session';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const editableStatuses = ['draft', 'open'] as const;

const parseFormData = (formData: FormData) =>
	buildSessionInputSchema(0).safeParse({
		club_id: formData.get('club_id'),
		name: formData.get('name'),
		description: formData.get('description'),
		start_at: formData.get('start_at'),
		end_at: formData.get('end_at'),
		venue_name: formData.get('venue_name'),
		latitude: formData.get('latitude'),
		longitude: formData.get('longitude'),
		max_players: formData.get('max_players'),
		min_players: formData.get('min_players'),
		court_count: formData.get('court_count'),
		court_fee_per_hour: formData.get('court_fee_per_hour'),
		shuttle_id: formData.get('shuttle_id'),
		shuttle_price_per_each: formData.get('shuttle_price_per_each'),
		match_score_type: formData.get('match_score_type'),
		match_type: formData.get('match_type'),
		cancellation_fee: formData.get('cancellation_fee'),
		max_buffer: formData.get('max_buffer')
	});

export const load: PageServerLoad = async ({
	params,
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

	try {
		await assertCanManageClub(supabase, user.id, session.club_id, effectiveAppRole);
	} catch {
		error(403, 'Club admin access required');
	}

	if (
		!editableStatuses.includes(session.status as (typeof editableStatuses)[number]) ||
		!isSessionMutable(session.start_at)
	) {
		redirect(303, `/sessions/${params.id}`);
	}

	const managedClubs = await loadManagedClubs(supabase, user.id, effectiveAppRole);
	const shuttles = await loadShuttlesForClubs(supabase, [session.club_id]);

	return { session, managedClubs, shuttles };
};

export const actions: Actions = {
	default: async ({ params, request, cookies, locals: { supabase, user, appRole } }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		const session = await loadSessionDetail(supabase, params.id);

		if (!session) {
			return fail(404, { message: 'Session not found' });
		}

		try {
			await assertCanManageClub(supabase, user.id, session.club_id, effectiveAppRole);
		} catch {
			return fail(403, { message: 'Club admin access required' });
		}

		if (
			!editableStatuses.includes(session.status as (typeof editableStatuses)[number]) ||
			!isSessionMutable(session.start_at)
		) {
			return fail(400, {
				message: 'This session can no longer be edited within 15 minutes of start.'
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData);

		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				message: Object.values(fieldErrors).flat()[0] ?? 'Invalid session input',
				fieldErrors
			});
		}

		if (parsed.data.club_id !== session.club_id) {
			return fail(400, { message: 'Cannot change the club for this session.' });
		}

		const { data: shuttle, error: shuttleError } = await supabase
			.from('club_shuttles')
			.select('id')
			.eq('id', parsed.data.shuttle_id)
			.eq('club_id', session.club_id)
			.maybeSingle();

		if (shuttleError || !shuttle) {
			return fail(400, { message: 'Selected shuttle is not valid for this club' });
		}

		const description = sanitizeRichText(parsed.data.description);

		const { data, error: updateError } = await supabase
			.from('sessions')
			.update({
				name: parsed.data.name,
				description,
				status: 'draft',
				start_at: parsed.data.start_at,
				end_at: parsed.data.end_at,
				venue_name: parsed.data.venue_name,
				latitude: parsed.data.latitude,
				longitude: parsed.data.longitude,
				max_players: parsed.data.max_players,
				min_players: parsed.data.min_players,
				court_count: parsed.data.court_count,
				court_fee_per_hour: parsed.data.court_fee_per_hour,
				shuttle_id: parsed.data.shuttle_id,
				shuttle_price_per_each: parsed.data.shuttle_price_per_each,
				match_score_type: parsed.data.match_score_type,
				match_type: parsed.data.match_type,
				cancellation_fee: parsed.data.cancellation_fee,
				max_buffer: parsed.data.max_buffer
			})
			.eq('id', params.id)
			.in('status', [...editableStatuses])
			.select('id')
			.maybeSingle();

		if (updateError) {
			console.error('Failed to update session', updateError);
			return fail(500, { message: 'Could not save session. Please try again.' });
		}

		if (!data) {
			return fail(400, { message: 'Session is no longer editable.' });
		}

		const releaseResult = await releaseActiveSessionPlayers(supabase, params.id);
		if (!releaseResult.ok) {
			return fail(500, { message: releaseResult.message });
		}

		redirect(303, `/sessions/${params.id}?edited=1`);
	}
};
