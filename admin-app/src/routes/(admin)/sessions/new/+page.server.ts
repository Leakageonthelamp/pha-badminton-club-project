import { resolveEffectiveAppRole } from '$lib/server/adminDashboardMode';
import { assertCanManageClub, loadManagedClubs } from '$lib/server/clubAccess';
import { countActiveClubSessions, loadShuttlesForClubs } from '$lib/server/sessions';
import { sanitizeRichText } from '$lib/server/sanitizeHtml';
import { sessionInputSchema } from '$lib/validation/session';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({
	cookies,
	locals: { supabase, user, appRole }
}) => {
	if (!user || !appRole) {
		error(401, 'Sign in required');
	}

	const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);

	if (effectiveAppRole !== 'club_admin') {
		error(403, 'Club admin access required to create sessions');
	}

	const managedClubs = await loadManagedClubs(supabase, user.id, effectiveAppRole);
	if (!managedClubs.length) {
		error(403, 'No clubs assigned to you');
	}

	const shuttles = await loadShuttlesForClubs(
		supabase,
		managedClubs.map((club) => club.id)
	);

	return {
		managedClubs,
		shuttles
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, locals: { supabase, user, appRole } }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);

		if (effectiveAppRole !== 'club_admin') {
			return fail(403, { message: 'Club admin access required to create sessions' });
		}

		const formData = await request.formData();
		const parsed = sessionInputSchema.safeParse({
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

		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				message: Object.values(fieldErrors).flat()[0] ?? 'Invalid session input',
				fieldErrors,
				values: Object.fromEntries(formData.entries())
			});
		}

		const club = await assertCanManageClub(
			supabase,
			user.id,
			parsed.data.club_id,
			effectiveAppRole
		);

		const activeCount = await countActiveClubSessions(supabase, club.id);
		if (activeCount >= club.max_active_sessions) {
			return fail(400, {
				message: `This club already has the maximum of ${club.max_active_sessions} active sessions`
			});
		}

		const { data: shuttle, error: shuttleError } = await supabase
			.from('club_shuttles')
			.select('id')
			.eq('id', parsed.data.shuttle_id)
			.eq('club_id', club.id)
			.maybeSingle();

		if (shuttleError || !shuttle) {
			return fail(400, { message: 'Selected shuttle is not valid for this club' });
		}

		const description = sanitizeRichText(parsed.data.description);

		const { data, error: insertError } = await supabase
			.from('sessions')
			.insert({
				club_id: club.id,
				host_id: user.id,
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
			.select('id')
			.single();

		if (insertError || !data) {
			console.error('Failed to create session', insertError);
			return fail(500, { message: 'Could not create session. Please try again.' });
		}

		redirect(303, `/sessions/${data.id}?created=1`);
	}
};
