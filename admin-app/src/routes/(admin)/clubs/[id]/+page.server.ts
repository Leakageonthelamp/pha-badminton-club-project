import {
	assertCanManageClub,
	assertSuperAdmin
} from '$lib/server/clubAccess';
import {
	CLUB_MAX_ACTIVE_SESSIONS_LIMIT,
	CLUB_MAX_ADMINS_LIMIT
} from '$lib/server/clubLimits';
import { buildProfileSearchOrFilter } from '$lib/server/profileSearch';
import { CLUB_DELETE_CONFIRM_PHRASE } from '$lib/config/club';
import type { ClubShuttle } from '$lib/types/club';
import { clubInputSchema } from '$lib/validation/club';
import {
	clubAdminClubInputSchema,
	locationInputSchema,
	promptPayInputSchema,
	shuttleDeleteSchema,
	shuttleInputSchema,
	shuttleUpdateSchema
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
	locals: { supabase, user, appRole }
}) => {
	if (!user || !appRole) {
		error(401, 'Sign in required');
	}

	const club = await assertCanManageClub(supabase, user.id, params.id, appRole);
	const isSuperAdmin = appRole === 'super_admin';
	const shuttles = await loadClubShuttles(supabase, params.id);
	let admins = await loadClubAdmins(supabase, params.id);
	let searchResults: ProfileSearchResult[] = [];
	const searchQuery = url.searchParams.get('q')?.trim() ?? '';

	if (isSuperAdmin) {
		const assignedIds = new Set(admins.map((row) => row.user_id));

		if (searchQuery.length >= 2) {
			const { data: matches, error: searchError } = await supabase
				.from('profiles')
				.select('id, display_name, tag, email, phone, app_role')
				.neq('app_role', 'super_admin')
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
		searchResults,
		searchQuery,
		appRole,
		isSuperAdmin,
		created: url.searchParams.get('created') === '1',
		maxActiveSessionsLimit: CLUB_MAX_ACTIVE_SESSIONS_LIMIT,
		maxAdminsLimit: CLUB_MAX_ADMINS_LIMIT,
		atAdminCapacity: admins.length >= club.max_admins
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals: { supabase, user, appRole } }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		await assertCanManageClub(supabase, user.id, params.id, appRole);

		const formData = await request.formData();

		if (appRole === 'club_admin') {
			const parsed = clubAdminClubInputSchema.safeParse({
				name: formData.get('name'),
				description: formData.get('description') ?? ''
			});

			if (!parsed.success) {
				const fieldErrors = parsed.error.flatten().fieldErrors;
				return fail(400, {
					message: Object.values(fieldErrors).flat()[0] ?? 'Invalid input',
					error: fieldErrors
				});
			}

			const { error: updateError } = await supabase
				.from('clubs')
				.update({
					name: parsed.data.name,
					description: parsed.data.description
				})
				.eq('id', params.id);

			if (updateError) {
				console.error('Failed to update club', updateError);
				return fail(500, { message: 'Could not update club. Please try again.' });
			}

			return { success: true, message: 'Club updated.' };
		}

		const parsed = clubInputSchema.safeParse({
			name: formData.get('name'),
			description: formData.get('description') ?? '',
			max_active_sessions: formData.get('max_active_sessions'),
			max_admins: formData.get('max_admins'),
			is_active: formData.get('is_active')
		});

		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				message: Object.values(fieldErrors).flat()[0] ?? 'Invalid input',
				error: fieldErrors
			});
		}

		const { count: assignedCount, error: countError } = await supabase
			.from('club_admins')
			.select('*', { count: 'exact', head: true })
			.eq('club_id', params.id);

		if (countError) {
			console.error('Failed to count club admins', countError);
			return fail(500, { message: 'Could not update club. Please try again.' });
		}

		if ((assignedCount ?? 0) > parsed.data.max_admins) {
			return fail(400, {
				message: `Max admins cannot be below current assignments (${assignedCount}). Remove admins first.`
			});
		}

		const { error: updateError } = await supabase
			.from('clubs')
			.update({
				name: parsed.data.name,
				description: parsed.data.description,
				max_active_sessions: parsed.data.max_active_sessions,
				max_admins: parsed.data.max_admins,
				is_active: parsed.data.is_active
			})
			.eq('id', params.id);

		if (updateError) {
			console.error('Failed to update club', updateError);
			return fail(500, {
				message: 'Could not update club. Please try again.',
				error: {},
				values: parsed.data
			});
		}

		return { success: true, message: 'Club updated.' };
	},

	updatePromptPay: async ({ request, params, locals: { supabase, user, appRole } }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		await assertCanManageClub(supabase, user.id, params.id, appRole);

		const formData = await request.formData();
		const parsed = promptPayInputSchema.safeParse({
			clear: formData.get('clear'),
			promptpay_type: formData.get('promptpay_type') || undefined,
			promptpay_target: String(formData.get('promptpay_target') ?? '')
		});

		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				message: Object.values(fieldErrors).flat()[0] ?? 'Invalid PromptPay info',
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
			return fail(500, { message: 'Could not save PromptPay info. Please try again.' });
		}

		return { success: true, message: 'PromptPay info saved.' };
	},

	updateLocation: async ({ request, params, locals: { supabase, user, appRole } }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		await assertCanManageClub(supabase, user.id, params.id, appRole);

		const formData = await request.formData();
		const parsed = locationInputSchema.safeParse({
			clear: formData.get('clear'),
			latitude: formData.get('latitude'),
			longitude: formData.get('longitude')
		});

		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				message: Object.values(fieldErrors).flat()[0] ?? 'Invalid location',
				error: fieldErrors
			});
		}

		const payload = parsed.data.clear
			? { latitude: null, longitude: null }
			: { latitude: parsed.data.latitude, longitude: parsed.data.longitude };

		const { error: updateError } = await supabase.from('clubs').update(payload).eq('id', params.id);

		if (updateError) {
			console.error('Failed to update location', updateError);
			return fail(500, { message: 'Could not save location. Please try again.' });
		}

		return { success: true, message: 'Location saved.' };
	},

	createShuttle: async ({ request, params, locals: { supabase, user, appRole } }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		await assertCanManageClub(supabase, user.id, params.id, appRole);

		const formData = await request.formData();
		const parsed = shuttleInputSchema.safeParse({
			name: formData.get('name'),
			speed: formData.get('speed'),
			original_price: formData.get('original_price'),
			price: formData.get('price'),
			number_per_box: formData.get('number_per_box')
		});

		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				message: Object.values(fieldErrors).flat()[0] ?? 'Invalid shuttle input',
				error: fieldErrors
			});
		}

		const { error: insertError } = await supabase.from('club_shuttles').insert({
			club_id: params.id,
			...parsed.data
		});

		if (insertError) {
			if (insertError.code === '23505') {
				return fail(400, { message: 'A shuttle with this name and speed already exists.' });
			}

			console.error('Failed to create shuttle', insertError);
			return fail(500, { message: 'Could not add shuttle. Please try again.' });
		}

		return { success: true, message: 'Shuttle added.' };
	},

	updateShuttle: async ({ request, params, locals: { supabase, user, appRole } }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		await assertCanManageClub(supabase, user.id, params.id, appRole);

		const formData = await request.formData();
		const parsed = shuttleUpdateSchema.safeParse({
			shuttleId: formData.get('shuttleId'),
			name: formData.get('name'),
			speed: formData.get('speed'),
			original_price: formData.get('original_price'),
			price: formData.get('price'),
			number_per_box: formData.get('number_per_box')
		});

		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				message: Object.values(fieldErrors).flat()[0] ?? 'Invalid shuttle input',
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
				return fail(400, { message: 'A shuttle with this name and speed already exists.' });
			}

			console.error('Failed to update shuttle', updateError);
			return fail(500, { message: 'Could not update shuttle. Please try again.' });
		}

		return { success: true, message: 'Shuttle updated.' };
	},

	deleteShuttle: async ({ request, params, locals: { supabase, user, appRole } }) => {
		if (!user || !appRole) {
			return fail(401, { message: 'Sign in required' });
		}

		await assertCanManageClub(supabase, user.id, params.id, appRole);

		const formData = await request.formData();
		const parsed = shuttleDeleteSchema.safeParse({
			shuttleId: formData.get('shuttleId')
		});

		if (!parsed.success) {
			return fail(400, { message: 'Invalid shuttle selected' });
		}

		const { error: deleteError } = await supabase
			.from('club_shuttles')
			.delete()
			.eq('id', parsed.data.shuttleId)
			.eq('club_id', params.id);

		if (deleteError) {
			console.error('Failed to delete shuttle', deleteError);
			return fail(500, { message: 'Could not delete shuttle. Please try again.' });
		}

		return { success: true, message: 'Shuttle removed.' };
	},

	delete: async ({ request, params, locals: { supabase, appRole } }) => {
		assertSuperAdmin(appRole);

		const formData = await request.formData();
		const confirmText = String(formData.get('confirmText') ?? '').trim();

		if (confirmText !== CLUB_DELETE_CONFIRM_PHRASE) {
			return fail(400, { message: `Type "${CLUB_DELETE_CONFIRM_PHRASE}" to confirm deletion.` });
		}

		const { error: deleteError } = await supabase.from('clubs').delete().eq('id', params.id);

		if (deleteError) {
			console.error('Failed to delete club', deleteError);
			return fail(500, { message: 'Could not delete club. Please try again.' });
		}

		redirect(303, '/?deleted=1');
	},

	assign: async ({ request, params, locals: { supabase, user, appRole } }) => {
		assertSuperAdmin(appRole);

		if (!user) {
			return fail(401, { message: 'Sign in required' });
		}

		const formData = await request.formData();
		const parsed = assignSchema.safeParse({
			userId: formData.get('userId')
		});

		if (!parsed.success) {
			return fail(400, { message: 'Invalid user selected' });
		}

		const { data: club, error: clubError } = await supabase
			.from('clubs')
			.select('max_admins')
			.eq('id', params.id)
			.single();

		if (clubError || !club) {
			return fail(404, { message: 'Club not found' });
		}

		const { count: assignedCount, error: countError } = await supabase
			.from('club_admins')
			.select('*', { count: 'exact', head: true })
			.eq('club_id', params.id);

		if (countError) {
			console.error('Failed to count club admins', countError);
			return fail(500, { message: 'Could not assign club admin. Please try again.' });
		}

		if ((assignedCount ?? 0) >= club.max_admins) {
			return fail(400, {
				message: `This club already has the maximum of ${club.max_admins} admins`
			});
		}

		const { data: target, error: targetError } = await supabase
			.from('profiles')
			.select('id, app_role')
			.eq('id', parsed.data.userId)
			.single();

		if (targetError || !target) {
			return fail(404, { message: 'User not found' });
		}

		if (target.app_role === 'super_admin') {
			return fail(400, { message: 'Super admins cannot be assigned as club admins' });
		}

		const { count: existingMembershipCount, error: membershipError } = await supabase
			.from('club_admins')
			.select('*', { count: 'exact', head: true })
			.eq('club_id', params.id)
			.eq('user_id', parsed.data.userId);

		if (membershipError) {
			console.error('Failed to check existing club admin membership', membershipError);
			return fail(500, { message: 'Could not assign club admin. Please try again.' });
		}

		if ((existingMembershipCount ?? 0) > 0) {
			return fail(400, { message: 'User is already a club admin for this club' });
		}

		const { error: insertError } = await supabase.from('club_admins').insert({
			club_id: params.id,
			user_id: parsed.data.userId,
			assigned_by: user.id
		});

		if (insertError) {
			if (insertError.code === '23505') {
				return fail(400, { message: 'User is already a club admin for this club' });
			}

			console.error('Failed to assign club admin', insertError);
			return fail(500, { message: 'Could not assign club admin. Please try again.' });
		}

		return { success: true, message: 'Club admin assigned.' };
	},

	remove: async ({ request, params, locals: { supabase, appRole } }) => {
		assertSuperAdmin(appRole);

		const formData = await request.formData();
		const parsed = removeSchema.safeParse({
			userId: formData.get('userId')
		});

		if (!parsed.success) {
			return fail(400, { message: 'Invalid user selected' });
		}

		const { error: removeError } = await supabase
			.from('club_admins')
			.delete()
			.eq('club_id', params.id)
			.eq('user_id', parsed.data.userId);

		if (removeError) {
			console.error('Failed to remove club admin', removeError);
			return fail(500, { message: 'Could not remove club admin. Please try again.' });
		}

		return { success: true, message: 'Club admin removed.' };
	}
};
