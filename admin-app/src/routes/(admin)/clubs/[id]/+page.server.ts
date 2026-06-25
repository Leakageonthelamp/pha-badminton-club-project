import { clubInputSchema } from '$lib/validation/club';
import type { Club } from '$lib/types/club';
import type { Profile } from '$lib/types/auth';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';

type AdminProfile = Pick<Profile, 'display_name' | 'tag' | 'email' | 'app_role'>;

type AdminRow = {
	user_id: string;
	created_at: string;
	profiles: AdminProfile | AdminProfile[] | null;
};

const normalizeAdminRow = (row: AdminRow) => ({
	user_id: row.user_id,
	created_at: row.created_at,
	profiles: Array.isArray(row.profiles) ? (row.profiles[0] ?? null) : row.profiles
});

const assignSchema = z.object({
	userId: z.string().uuid()
});

const removeSchema = z.object({
	userId: z.string().uuid()
});

export const load: PageServerLoad = async ({ params, url, locals: { supabase } }) => {
	const { data: club, error: clubError } = await supabase
		.from('clubs')
		.select('*')
		.eq('id', params.id)
		.single();

	if (clubError || !club) {
		error(404, 'Club not found');
	}

	const { data: adminRows, error: adminsError } = await supabase
		.from('club_admins')
		.select('user_id, created_at, profiles(display_name, tag, email, app_role)')
		.eq('club_id', params.id);

	if (adminsError) {
		console.error('Failed to load club admins', adminsError);
	}

	const admins = (adminRows ?? []).map((row) => normalizeAdminRow(row as AdminRow));
	const assignedIds = new Set(admins.map((row) => row.user_id));

	const searchQuery = url.searchParams.get('q')?.trim() ?? '';
	let searchResults: Pick<Profile, 'id' | 'display_name' | 'tag' | 'email' | 'app_role'>[] = [];

	if (searchQuery.length >= 2) {
		const escaped = searchQuery.replace(/[%_,]/g, '');
		const pattern = `%${escaped}%`;

		const { data: matches, error: searchError } = await supabase
			.from('profiles')
			.select('id, display_name, tag, email, app_role')
			.or(`display_name.ilike.${pattern},tag.ilike.${pattern},email.ilike.${pattern}`)
			.neq('app_role', 'super_admin')
			.limit(20);

		if (searchError) {
			console.error('User search failed', searchError);
		} else {
			searchResults = (matches ?? []).filter((profile) => !assignedIds.has(profile.id));
		}
	}

	return {
		club: club as Club,
		admins,
		searchResults,
		searchQuery,
		created: url.searchParams.get('created') === '1'
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals: { supabase } }) => {
		const formData = await request.formData();
		const parsed = clubInputSchema.safeParse({
			name: formData.get('name'),
			description: formData.get('description') ?? '',
			max_active_sessions: formData.get('max_active_sessions')
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
				description: parsed.data.description,
				max_active_sessions: parsed.data.max_active_sessions
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

	delete: async ({ params, locals: { supabase } }) => {
		const { error: deleteError } = await supabase.from('clubs').delete().eq('id', params.id);

		if (deleteError) {
			console.error('Failed to delete club', deleteError);
			return fail(500, { message: 'Could not delete club. Please try again.' });
		}

		redirect(303, '/?deleted=1');
	},

	assign: async ({ request, params, locals: { supabase, user } }) => {
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

	remove: async ({ request, params, locals: { supabase } }) => {
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
