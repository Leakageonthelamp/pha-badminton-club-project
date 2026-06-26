import type { AppRole } from '$lib/types/auth';
import type { Club } from '$lib/types/club';
import { error } from '@sveltejs/kit';

const ADMIN_APP_ROLES = new Set<AppRole>(['super_admin', 'club_admin']);

export const isAdminAppRole = (role: AppRole | null): role is AppRole =>
	role !== null && ADMIN_APP_ROLES.has(role);

export const assertSuperAdmin = (appRole: AppRole | null) => {
	if (appRole !== 'super_admin') {
		error(403, 'Super admin access required');
	}
};

export const loadManagedClubs = async (
	supabase: App.Locals['supabase'],
	userId: string,
	appRole: AppRole
): Promise<Club[]> => {
	if (appRole === 'super_admin') {
		const { data, error: loadError } = await supabase
			.from('clubs')
			.select('*')
			.order('created_at', { ascending: false });

		if (loadError) {
			console.error('Failed to load clubs', loadError);
			return [];
		}

		return (data ?? []) as Club[];
	}

	const { data: memberships, error: membershipError } = await supabase
		.from('club_admins')
		.select('club_id')
		.eq('user_id', userId);

	if (membershipError) {
		console.error('Failed to load club admin memberships', membershipError);
		return [];
	}

	const clubIds = (memberships ?? []).map((row) => row.club_id);
	if (!clubIds.length) {
		return [];
	}

	const { data: clubs, error: clubsError } = await supabase
		.from('clubs')
		.select('*')
		.in('id', clubIds)
		.order('created_at', { ascending: false });

	if (clubsError) {
		console.error('Failed to load managed clubs', clubsError);
		return [];
	}

	return (clubs ?? []) as Club[];
};

export const assertCanManageClub = async (
	supabase: App.Locals['supabase'],
	userId: string,
	clubId: string,
	appRole: AppRole
): Promise<Club> => {
	if (appRole === 'super_admin') {
		const { data: club, error: clubError } = await supabase
			.from('clubs')
			.select('*')
			.eq('id', clubId)
			.single();

		if (clubError || !club) {
			error(404, 'Club not found');
		}

		return club as Club;
	}

	const { data: membership, error: membershipError } = await supabase
		.from('club_admins')
		.select('club_id')
		.eq('club_id', clubId)
		.eq('user_id', userId)
		.maybeSingle();

	if (membershipError) {
		console.error('Failed to verify club admin membership', membershipError);
		error(500, 'Could not verify club access');
	}

	if (!membership) {
		error(403, 'You do not have access to this club');
	}

	const { data: club, error: clubError } = await supabase
		.from('clubs')
		.select('*')
		.eq('id', clubId)
		.single();

	if (clubError || !club) {
		error(404, 'Club not found');
	}

	return club as Club;
};
