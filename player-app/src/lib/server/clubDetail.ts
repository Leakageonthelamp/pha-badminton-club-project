import type { ClubAdminPublic, ClubDetail, ClubShuttlePublic } from '$lib/types/club';

const loadClubAdmins = async (
	supabase: App.Locals['supabase'],
	clubId: string
): Promise<ClubAdminPublic[]> => {
	const { data: adminRows, error: adminsError } = await supabase
		.from('club_admins')
		.select('user_id')
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
		.select('id, display_name, tag, avatar_url')
		.in('id', userIds);

	if (profilesError) {
		console.error('Failed to load club admin profiles', profilesError);
		return [];
	}

	const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

	return adminRows.map((row) => {
		const profile = profileById.get(row.user_id);
		return {
			user_id: row.user_id,
			display_name: profile?.display_name ?? 'Unknown',
			tag: profile?.tag ?? '',
			avatar_url: profile?.avatar_url ?? null
		};
	});
};

const loadClubShuttles = async (
	supabase: App.Locals['supabase'],
	clubId: string
): Promise<ClubShuttlePublic[]> => {
	const { data, error } = await supabase
		.from('club_shuttles')
		.select('id, name, speed, original_price, price, number_per_box')
		.eq('club_id', clubId)
		.order('name', { ascending: true });

	if (error) {
		console.error('Failed to load club shuttles', error);
		return [];
	}

	return (data ?? []) as ClubShuttlePublic[];
};

export const loadClubDetail = async (
	supabase: App.Locals['supabase'],
	clubId: string
): Promise<ClubDetail | null> => {
	const { data: club, error: clubError } = await supabase
		.from('clubs')
		.select('id, name, description, latitude, longitude')
		.eq('id', clubId)
		.eq('is_active', true)
		.single();

	if (clubError || !club) {
		return null;
	}

	const [admins, shuttles] = await Promise.all([
		loadClubAdmins(supabase, clubId),
		loadClubShuttles(supabase, clubId)
	]);

	return {
		club,
		admins,
		shuttles
	};
};
