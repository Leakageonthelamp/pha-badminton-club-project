import type {
	ClubAdminPublic,
	ClubDetail,
	ClubSessionPublic,
	ClubShuttlePublic
} from '$lib/types/club';
import type { SessionPlayerMembership, SessionPlayerStatus } from '$lib/types/session';
import { sweepStartedSessions } from '$lib/server/sessions';
import { ensureSupabaseAuth } from '$lib/server/supabaseAuth';

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
		.select('id, name, speed, price, number_per_box')
		.eq('club_id', clubId)
		.order('name', { ascending: true });

	if (error) {
		console.error('Failed to load club shuttles', error);
		return [];
	}

	return (data ?? []) as ClubShuttlePublic[];
};

const loadSessionMembershipMeta = async (
	supabase: App.Locals['supabase'],
	userId: string,
	sessionIds: string[]
): Promise<{
	counts: Map<string, { waiting: number; queued: number; confirmed: number }>;
	memberships: Map<string, SessionPlayerMembership>;
}> => {
	const counts = new Map<string, { waiting: number; queued: number; confirmed: number }>();
	const memberships = new Map<string, SessionPlayerMembership>();

	if (!sessionIds.length) {
		return { counts, memberships };
	}

	if (!(await ensureSupabaseAuth(supabase))) {
		return { counts, memberships };
	}

	const [{ data: playerRows, error: playerError }, { data: myRows, error: myError }] =
		await Promise.all([
			supabase
				.from('session_players')
				.select('session_id, status')
				.in('session_id', sessionIds)
				.in('status', ['waiting', 'queued', 'confirmed']),
			supabase
				.from('session_players')
				.select('id, session_id, status, fee_owed, joined_at')
				.eq('user_id', userId)
				.in('session_id', sessionIds)
				.in('status', ['waiting', 'queued', 'confirmed'])
		]);

	if (playerError) {
		console.error('Failed to load club session player counts', playerError);
	} else {
		for (const row of playerRows ?? []) {
			const current = counts.get(row.session_id) ?? { waiting: 0, queued: 0, confirmed: 0 };
			if (row.status === 'waiting') current.waiting += 1;
			if (row.status === 'queued') current.queued += 1;
			if (row.status === 'confirmed') current.confirmed += 1;
			counts.set(row.session_id, current);
		}
	}

	if (myError) {
		console.error('Failed to load my club session memberships', myError);
	} else {
		for (const row of myRows ?? []) {
			memberships.set(row.session_id, {
				id: row.id,
				status: row.status as SessionPlayerStatus,
				fee_owed: Number(row.fee_owed),
				joined_at: row.joined_at
			});
		}
	}

	return { counts, memberships };
};

const splitClubSessions = (
	rows: Omit<ClubSessionPublic, 'waiting_count' | 'queued_count' | 'my_membership'>[],
	meta: {
		counts: Map<string, { waiting: number; queued: number; confirmed: number }>;
		memberships: Map<string, SessionPlayerMembership>;
	}
): { openingSessions: ClubSessionPublic[]; upcomingSessions: ClubSessionPublic[] } => {
	const now = Date.now();
	const openingSessions: ClubSessionPublic[] = [];
	const upcomingSessions: ClubSessionPublic[] = [];

	for (const row of rows) {
		const start = new Date(row.start_at).getTime();
		const end = new Date(row.end_at).getTime();
		if (end <= now) continue;

		const count = meta.counts.get(row.id) ?? { waiting: 0, queued: 0, confirmed: 0 };
		const session: ClubSessionPublic = {
			...row,
			waiting_count: count.waiting + count.confirmed,
			queued_count: count.queued,
			my_membership: meta.memberships.get(row.id) ?? null
		};

		if (row.status === 'in_progress' || start <= now) {
			openingSessions.push(session);
		} else {
			upcomingSessions.push(session);
		}
	}

	return { openingSessions, upcomingSessions };
};

const loadClubSessions = async (
	supabase: App.Locals['supabase'],
	clubId: string,
	userId: string
): Promise<{ openingSessions: ClubSessionPublic[]; upcomingSessions: ClubSessionPublic[] }> => {
	await sweepStartedSessions(supabase);

	const now = new Date().toISOString();

	const { data, error } = await supabase
		.from('sessions')
		.select('id, name, status, start_at, end_at, venue_name, max_players')
		.eq('club_id', clubId)
		.in('status', ['open', 'in_progress'])
		.gte('end_at', now)
		.order('start_at', { ascending: true });

	if (error) {
		console.error('Failed to load club sessions', error);
		return { openingSessions: [], upcomingSessions: [] };
	}

	const rows = (data ?? []) as Omit<
		ClubSessionPublic,
		'waiting_count' | 'queued_count' | 'my_membership'
	>[];
	const meta = await loadSessionMembershipMeta(
		supabase,
		userId,
		rows.map((row) => row.id)
	);

	return splitClubSessions(rows, meta);
};

export const loadClubDetail = async (
	supabase: App.Locals['supabase'],
	clubId: string,
	userId: string
): Promise<ClubDetail | null> => {
	const { data: club, error: clubError } = await supabase
		.from('clubs')
		.select('id, name, description, venue_name, latitude, longitude')
		.eq('id', clubId)
		.eq('is_active', true)
		.single();

	if (clubError || !club) {
		return null;
	}

	const [admins, shuttles, sessions] = await Promise.all([
		loadClubAdmins(supabase, clubId),
		loadClubShuttles(supabase, clubId),
		loadClubSessions(supabase, clubId, userId)
	]);

	return {
		club,
		admins,
		shuttles,
		openingSessions: sessions.openingSessions,
		upcomingSessions: sessions.upcomingSessions
	};
};
