import { tForLocale } from '$lib/i18n';
import {
	assertCanManageClub,
	assertSuperAdmin
} from '$lib/server/clubAccess';
import { resolveEffectiveAppRole } from '$lib/server/adminDashboardMode';
import {
	CLUB_MAX_ACTIVE_SESSIONS_LIMIT,
	CLUB_MAX_ADMINS_LIMIT
} from '$lib/server/clubLimits';
import { buildProfileSearchOrFilter } from '$lib/server/profileSearch';
import { sanitizeRichText } from '$lib/server/sanitizeHtml';
import { CLUB_DELETE_CONFIRM_PHRASE } from '$lib/config/club';
import type { ClubShuttle } from '$lib/types/club';
import { buildClubInputSchema } from '$lib/validation/club';
import {
	buildClubAdminClubInputSchema,
	buildLocationInputSchema,
	buildPromptPayInputSchema,
	buildShuttleDeleteSchema,
	buildShuttleInputSchema,
	buildShuttleUpdateSchema
} from '$lib/validation/clubSettings';
import type { Profile } from '$lib/types/auth';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';

type AdminProfile = Pick<Profile, 'display_name' | 'tag' | 'email' | 'phone' | 'app_role' | 'avatar_url'>;

export type ClubAdminWithProfile = {
	user_id: string;
	created_at: string;
	profile: AdminProfile | null;
	otherClubCount: number;
};

export type ProfileSearchResult = Pick<
	Profile,
	'id' | 'display_name' | 'tag' | 'email' | 'phone' | 'app_role'
> & {
	otherClubCount: number;
};

const assignSchema = z.object({
	userId: z.string().uuid()
});

const removeSchema = z.object({
	userId: z.string().uuid()
});

const loadOtherClubAdminCounts = async (
	supabase: App.Locals['supabase'],
	userIds: string[],
	excludeClubId: string
): Promise<Map<string, number>> => {
	if (!userIds.length) {
		return new Map();
	}

	const { data, error: loadError } = await supabase
		.from('club_admins')
		.select('user_id, club_id')
		.in('user_id', userIds);

	if (loadError) {
		console.error('Failed to load club admin memberships', loadError);
		return new Map();
	}

	const counts = new Map<string, number>();
	for (const row of data ?? []) {
		if (row.club_id === excludeClubId) {
			continue;
		}
		counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
	}

	return counts;
};

const loadClubAdmins = async (
	supabase: App.Locals['supabase'],
	clubId: string
): Promise<ClubAdminWithProfile[]> => {
	const { data: adminRows, error: adminsError } = await supabase
		.from('club_admins')
		.select('user_id, created_at')
		.eq('club_id', clubId)
		.order('created_at', { ascending: true });

	if (adminsError) {
		console.error('Failed to load club admins', adminsError);
		return [];
	}

	if (!adminRows?.length) {
		return [];
	}

	const userIds = adminRows.map((row) => row.user_id);
	const { data: profiles, error: profilesError } = await supabase
		.from('profiles')
		.select('id, display_name, tag, email, phone, app_role, avatar_url')
		.in('id', userIds);

	if (profilesError) {
		console.error('Failed to load club admin profiles', profilesError);
	}

	const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

	return adminRows.map((row) => ({
		user_id: row.user_id,
		created_at: row.created_at,
		profile: profileById.get(row.user_id) ?? null,
		otherClubCount: 0
	}));
};

const loadClubShuttles = async (
	supabase: App.Locals['supabase'],
	clubId: string
): Promise<ClubShuttle[]> => {
	const { data, error: loadError } = await supabase
		.from('club_shuttles')
		.select('*')
		.eq('club_id', clubId)
		.order('name', { ascending: true });

	if (loadError) {
		console.error('Failed to load club shuttles', loadError);
		return [];
	}

	return (data ?? []) as ClubShuttle[];
};

export const load: PageServerLoad = async ({
	params,
	url,
	cookies,
	locals: { supabase, user, appRole, locale }
}) => {
	if (!user || !appRole) {
		error(401, tForLocale(locale, 'auth.error.signInRequired'));
	}

	const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
	const club = await assertCanManageClub(supabase, user.id, params.id, effectiveAppRole);
	const isSuperAdmin = effectiveAppRole === 'super_admin';
	const shuttles = await loadClubShuttles(supabase, params.id);
	let admins = await loadClubAdmins(supabase, params.id);
	const { count: sessionCount, error: sessionCountError } = await supabase
		.from('sessions')
		.select('*', { count: 'exact', head: true })
		.eq('club_id', params.id);

	if (sessionCountError) {
		console.error('Failed to count club sessions', sessionCountError);
	}
	let searchResults: ProfileSearchResult[] = [];
	const searchQuery = url.searchParams.get('q')?.trim() ?? '';

	if (isSuperAdmin) {
		const assignedIds = new Set(admins.map((row) => row.user_id));

		if (searchQuery.length >= 2) {
			const { data: matches, error: searchError } = await supabase
				.from('profiles')
				.select('id, display_name, tag, email, phone, app_role')
				.or(buildProfileSearchOrFilter(searchQuery))
				.limit(20);

			if (searchError) {
				console.error('User search failed', searchError);
			} else {
				searchResults = (matches ?? [])
					.filter((profile) => !assignedIds.has(profile.id))
					.map((profile) => ({ ...profile, otherClubCount: 0 }));
			}
		}

		const membershipUserIds = [
			...new Set([
				...searchResults.map((profile) => profile.id),
				...admins.map((admin) => admin.user_id)
			])
		];
		const otherClubCounts = await loadOtherClubAdminCounts(
			supabase,
			membershipUserIds,
			params.id
		);

		searchResults = searchResults.map((profile) => ({
			...profile,
			otherClubCount: otherClubCounts.get(profile.id) ?? 0
		}));
		admins = admins.map((admin) => ({
			...admin,
			otherClubCount: otherClubCounts.get(admin.user_id) ?? 0
		}));
	}

	return {
		club,
		shuttles,
		admins,
		sessionCount: sessionCount ?? 0,
		searchResults,
		searchQuery,
		appRole: effectiveAppRole,
		isSuperAdmin,
		created: url.searchParams.get('created') === '1',
		maxActiveSessionsLimit: CLUB_MAX_ACTIVE_SESSIONS_LIMIT,
		maxAdminsLimit: CLUB_MAX_ADMINS_LIMIT,
		atAdminCapacity: admins.length >= club.max_admins
	};
};

export const actions: Actions = {
	update: async ({ request, params, cookies, locals: { supabase, user, appRole, locale } }) => {
		if (!user || !appRole) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		await assertCanManageClub(supabase, user.id, params.id, effectiveAppRole);

		const formData = await request.formData();

		if (effectiveAppRole === 'club_admin') {
			const parsed = buildClubAdminClubInputSchema(locale).safeParse({
				name: formData.get('name'),
				description: formData.get('description') ?? ''
			});

			if (!parsed.success) {
				const fieldErrors = parsed.error.flatten().fieldErrors;
				return fail(400, {
					message: Object.values(fieldErrors).flat()[0] ?? tForLocale(locale, 'errors.invalidInput'),
					error: fieldErrors
				});
			}

			const { error: updateError } = await supabase
				.from('clubs')
				.update({
					name: parsed.data.name,
					description: sanitizeRichText(parsed.data.description)
				})
				.eq('id', params.id);

			if (updateError) {
				console.error('Failed to update club', updateError);
				return fail(500, { message: tForLocale(locale, 'clubs.action.updateFailed') });
			}

			return { success: true, message: tForLocale(locale, 'clubs.action.updated') };
		}

		const parsed = buildClubInputSchema(locale).safeParse({
			name: formData.get('name'),
			description: formData.get('description') ?? '',
			max_active_sessions: formData.get('max_active_sessions'),
			max_admins: formData.get('max_admins'),
			is_active: formData.get('is_active')
		});

		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				message: Object.values(fieldErrors).flat()[0] ?? tForLocale(locale, 'errors.invalidInput'),
				error: fieldErrors
			});
		}

		const { count: assignedCount, error: countError } = await supabase
			.from('club_admins')
			.select('*', { count: 'exact', head: true })
			.eq('club_id', params.id);

		if (countError) {
			console.error('Failed to count club admins', countError);
			return fail(500, { message: tForLocale(locale, 'clubs.action.updateFailed') });
		}

		if ((assignedCount ?? 0) > parsed.data.max_admins) {
			return fail(400, {
				message: tForLocale(locale, 'clubs.action.maxAdminsBelowAssignments', {
					count: assignedCount ?? 0
				})
			});
		}

		const { error: updateError } = await supabase
			.from('clubs')
			.update({
				name: parsed.data.name,
				description: sanitizeRichText(parsed.data.description),
				max_active_sessions: parsed.data.max_active_sessions,
				max_admins: parsed.data.max_admins,
				is_active: parsed.data.is_active
			})
			.eq('id', params.id);

		if (updateError) {
			console.error('Failed to update club', updateError);
			return fail(500, {
				message: tForLocale(locale, 'clubs.action.updateFailed'),
				error: {},
				values: parsed.data
			});
		}

		return { success: true, message: tForLocale(locale, 'clubs.action.updated') };
	},

	updatePromptPay: async ({ request, params, cookies, locals: { supabase, user, appRole, locale } }) => {
		if (!user || !appRole) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		await assertCanManageClub(supabase, user.id, params.id, effectiveAppRole);

		const formData = await request.formData();
		const parsed = buildPromptPayInputSchema(locale).safeParse({
			clear: formData.get('clear'),
			promptpay_type: formData.get('promptpay_type') || undefined,
			promptpay_target: String(formData.get('promptpay_target') ?? '')
		});

		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				message: Object.values(fieldErrors).flat()[0] ?? tForLocale(locale, 'errors.invalidPromptPayInfo'),
				error: fieldErrors
			});
		}

		const payload = parsed.data.clear
			? { promptpay_type: null, promptpay_target: null }
			: {
					promptpay_type: parsed.data.promptpay_type ?? null,
					promptpay_target: parsed.data.promptpay_target
				};

		const { error: updateError } = await supabase.from('clubs').update(payload).eq('id', params.id);

		if (updateError) {
			console.error('Failed to update PromptPay', updateError);
			return fail(500, { message: tForLocale(locale, 'clubs.action.promptPaySaveFailed') });
		}

		return { success: true, message: tForLocale(locale, 'clubs.action.promptPaySaved') };
	},

	updateLocation: async ({ request, params, cookies, locals: { supabase, user, appRole, locale } }) => {
		if (!user || !appRole) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		await assertCanManageClub(supabase, user.id, params.id, effectiveAppRole);

		const formData = await request.formData();
		const parsed = buildLocationInputSchema(locale).safeParse({
			clear: formData.get('clear'),
			venue_name: formData.get('venue_name'),
			latitude: formData.get('latitude'),
			longitude: formData.get('longitude')
		});

		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				message: Object.values(fieldErrors).flat()[0] ?? tForLocale(locale, 'errors.invalidLocation'),
				error: fieldErrors
			});
		}

		const payload = parsed.data.clear
			? { venue_name: null, latitude: null, longitude: null }
			: {
					venue_name: parsed.data.venue_name,
					latitude: parsed.data.latitude,
					longitude: parsed.data.longitude
				};

		const { error: updateError } = await supabase.from('clubs').update(payload).eq('id', params.id);

		if (updateError) {
			console.error('Failed to update location', updateError);
			return fail(500, { message: tForLocale(locale, 'clubs.action.locationSaveFailed') });
		}

		return { success: true, message: tForLocale(locale, 'clubs.action.locationSaved') };
	},

	createShuttle: async ({ request, params, cookies, locals: { supabase, user, appRole, locale } }) => {
		if (!user || !appRole) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		await assertCanManageClub(supabase, user.id, params.id, effectiveAppRole);

		const formData = await request.formData();
		const parsed = buildShuttleInputSchema(locale).safeParse({
			name: formData.get('name'),
			speed: formData.get('speed'),
			price: formData.get('price'),
			number_per_box: formData.get('number_per_box')
		});

		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				message: Object.values(fieldErrors).flat()[0] ?? tForLocale(locale, 'errors.invalidShuttleInput'),
				error: fieldErrors
			});
		}

		const { error: insertError } = await supabase.from('club_shuttles').insert({
			club_id: params.id,
			...parsed.data
		});

		if (insertError) {
			if (insertError.code === '23505') {
				return fail(400, { message: tForLocale(locale, 'clubs.action.shuttleDuplicate') });
			}

			console.error('Failed to create shuttle', insertError);
			return fail(500, { message: tForLocale(locale, 'clubs.action.shuttleAddFailed') });
		}

		return { success: true, message: tForLocale(locale, 'clubs.action.shuttleAdded') };
	},

	updateShuttle: async ({ request, params, cookies, locals: { supabase, user, appRole, locale } }) => {
		if (!user || !appRole) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		await assertCanManageClub(supabase, user.id, params.id, effectiveAppRole);

		const formData = await request.formData();
		const parsed = buildShuttleUpdateSchema(locale).safeParse({
			shuttleId: formData.get('shuttleId'),
			name: formData.get('name'),
			speed: formData.get('speed'),
			price: formData.get('price'),
			number_per_box: formData.get('number_per_box')
		});

		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				message: Object.values(fieldErrors).flat()[0] ?? tForLocale(locale, 'errors.invalidShuttleInput'),
				error: fieldErrors
			});
		}

		const { shuttleId, ...values } = parsed.data;
		const { error: updateError } = await supabase
			.from('club_shuttles')
			.update(values)
			.eq('id', shuttleId)
			.eq('club_id', params.id);

		if (updateError) {
			if (updateError.code === '23505') {
				return fail(400, { message: tForLocale(locale, 'clubs.action.shuttleDuplicate') });
			}

			console.error('Failed to update shuttle', updateError);
			return fail(500, { message: tForLocale(locale, 'clubs.action.shuttleUpdateFailed') });
		}

		return { success: true, message: tForLocale(locale, 'clubs.action.shuttleUpdated') };
	},

	deleteShuttle: async ({ request, params, cookies, locals: { supabase, user, appRole, locale } }) => {
		if (!user || !appRole) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const { effectiveAppRole } = await resolveEffectiveAppRole(supabase, user.id, appRole, cookies);
		await assertCanManageClub(supabase, user.id, params.id, effectiveAppRole);

		const formData = await request.formData();
		const parsed = buildShuttleDeleteSchema(locale).safeParse({
			shuttleId: formData.get('shuttleId')
		});

		if (!parsed.success) {
			return fail(400, { message: tForLocale(locale, 'errors.invalidShuttleSelected') });
		}

		const { error: deleteError } = await supabase
			.from('club_shuttles')
			.delete()
			.eq('id', parsed.data.shuttleId)
			.eq('club_id', params.id);

		if (deleteError) {
			console.error('Failed to delete shuttle', deleteError);
			return fail(500, { message: tForLocale(locale, 'clubs.action.shuttleDeleteFailed') });
		}

		return { success: true, message: tForLocale(locale, 'clubs.action.shuttleRemoved') };
	},

	delete: async ({ request, params, locals: { supabase, appRole, locale } }) => {
		assertSuperAdmin(appRole);

		const formData = await request.formData();
		const confirmText = String(formData.get('confirmText') ?? '').trim();

		if (confirmText !== CLUB_DELETE_CONFIRM_PHRASE) {
			return fail(400, { message: tForLocale(locale, 'clubs.action.deleteConfirmRequired', { phrase: CLUB_DELETE_CONFIRM_PHRASE }) });
		}

		const { error: deleteError } = await supabase.from('clubs').delete().eq('id', params.id);

		if (deleteError) {
			console.error('Failed to delete club', deleteError);
			return fail(500, { message: tForLocale(locale, 'clubs.action.deleteFailed') });
		}

		redirect(303, '/?deleted=1');
	},

	assign: async ({ request, params, locals: { supabase, user, appRole, locale } }) => {
		assertSuperAdmin(appRole);

		if (!user) {
			return fail(401, { message: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const formData = await request.formData();
		const parsed = assignSchema.safeParse({
			userId: formData.get('userId')
		});

		if (!parsed.success) {
			return fail(400, { message: tForLocale(locale, 'errors.invalidRequest') });
		}

		const { data: club, error: clubError } = await supabase
			.from('clubs')
			.select('max_admins')
			.eq('id', params.id)
			.single();

		if (clubError || !club) {
			return fail(404, { message: tForLocale(locale, 'errors.clubNotFound') });
		}

		const { count: assignedCount, error: countError } = await supabase
			.from('club_admins')
			.select('*', { count: 'exact', head: true })
			.eq('club_id', params.id);

		if (countError) {
			console.error('Failed to count club admins', countError);
			return fail(500, { message: tForLocale(locale, 'clubs.action.assignFailed') });
		}

		if ((assignedCount ?? 0) >= club.max_admins) {
			return fail(400, {
				message: tForLocale(locale, 'clubs.action.maxAdmins', { max: club.max_admins })
			});
		}

		const { data: target, error: targetError } = await supabase
			.from('profiles')
			.select('id, app_role')
			.eq('id', parsed.data.userId)
			.single();

		if (targetError || !target) {
			return fail(404, { message: tForLocale(locale, 'errors.userNotFound') });
		}

		const { count: existingMembershipCount, error: membershipError } = await supabase
			.from('club_admins')
			.select('*', { count: 'exact', head: true })
			.eq('club_id', params.id)
			.eq('user_id', parsed.data.userId);

		if (membershipError) {
			console.error('Failed to check existing club admin membership', membershipError);
			return fail(500, { message: tForLocale(locale, 'clubs.action.assignFailed') });
		}

		if ((existingMembershipCount ?? 0) > 0) {
			return fail(400, { message: tForLocale(locale, 'clubs.action.alreadyAdmin') });
		}

		const { error: insertError } = await supabase.from('club_admins').insert({
			club_id: params.id,
			user_id: parsed.data.userId,
			assigned_by: user.id
		});

		if (insertError) {
			if (insertError.code === '23505') {
				return fail(400, { message: tForLocale(locale, 'clubs.action.alreadyAdmin') });
			}

			console.error('Failed to assign club admin', insertError);
			return fail(500, { message: tForLocale(locale, 'clubs.action.assignFailed') });
		}

		return { success: true, message: tForLocale(locale, 'clubs.action.adminAssigned') };
	},

	remove: async ({ request, params, locals: { supabase, appRole, locale } }) => {
		assertSuperAdmin(appRole);

		const formData = await request.formData();
		const parsed = removeSchema.safeParse({
			userId: formData.get('userId')
		});

		if (!parsed.success) {
			return fail(400, { message: tForLocale(locale, 'errors.invalidRequest') });
		}

		const { error: removeError } = await supabase
			.from('club_admins')
			.delete()
			.eq('club_id', params.id)
			.eq('user_id', parsed.data.userId);

		if (removeError) {
			console.error('Failed to remove club admin', removeError);
			return fail(500, { message: tForLocale(locale, 'clubs.action.removeAdminFailed') });
		}

		return { success: true, message: tForLocale(locale, 'clubs.action.adminRemoved') };
	}
};
