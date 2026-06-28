import type {
	SessionDetail,
	SessionListItem,
	SessionPlayerMembership,
	SessionPlayerPublic,
	SessionPlayerStatus
} from '$lib/types/session';
import type { SupabaseClient } from '@supabase/supabase-js';

const normalizeRelation = <T>(value: T | T[] | null | undefined): T | null => {
	if (Array.isArray(value)) {
		return value[0] ?? null;
	}

	return value ?? null;
};

const sessionListSelect = `
	id,
	club_id,
	name,
	description,
	status,
	start_at,
	end_at,
	venue_name,
	latitude,
	longitude,
	max_players,
	min_players,
	court_count,
	court_fee_per_hour,
	shuttle_price_per_each,
	match_score_type,
	match_type,
	cancellation_fee,
	max_buffer,
	club:clubs ( id, name )
`;

const sessionDetailSelect = `
	${sessionListSelect},
	host:profiles!sessions_host_id_fkey ( id, display_name, tag ),
	shuttle:club_shuttles ( id, name, speed, price, number_per_box )
`;

type SessionPlayerRow = {
	id: string;
	session_id: string;
	user_id: string;
	status: SessionPlayerStatus;
	fee_owed: number;
	joined_at: string;
};

const loadMembershipCounts = async (
	supabase: SupabaseClient,
	sessionIds: string[]
): Promise<Map<string, { waiting: number; queued: number; confirmed: number }>> => {
	const counts = new Map<string, { waiting: number; queued: number; confirmed: number }>();

	if (!sessionIds.length) return counts;

	const { data, error } = await supabase
		.from('session_players')
		.select('session_id, status')
		.in('session_id', sessionIds)
		.in('status', ['waiting', 'queued', 'confirmed']);

	if (error) {
		console.error('Failed to load session player counts', error);
		return counts;
	}

	for (const row of data ?? []) {
		const current = counts.get(row.session_id) ?? { waiting: 0, queued: 0, confirmed: 0 };
		if (row.status === 'waiting') current.waiting += 1;
		if (row.status === 'queued') current.queued += 1;
		if (row.status === 'confirmed') current.confirmed += 1;
		counts.set(row.session_id, current);
	}

	return counts;
};

const loadMyMemberships = async (
	supabase: SupabaseClient,
	userId: string,
	sessionIds: string[]
): Promise<Map<string, SessionPlayerMembership>> => {
	const map = new Map<string, SessionPlayerMembership>();

	if (!sessionIds.length) return map;

	const { data, error } = await supabase
		.from('session_players')
		.select('id, session_id, status, fee_owed, joined_at')
		.eq('user_id', userId)
		.in('session_id', sessionIds)
		.in('status', ['waiting', 'queued', 'confirmed']);

	if (error) {
		console.error('Failed to load my session memberships', error);
		return map;
	}

	for (const row of data ?? []) {
		map.set(row.session_id, {
			id: row.id,
			status: row.status as SessionPlayerStatus,
			fee_owed: Number(row.fee_owed),
			joined_at: row.joined_at
		});
	}

	return map;
};

const rosterSelect = `
	id,
	user_id,
	status,
	joined_at,
	profile:profiles ( display_name, tag, avatar_url )
`;

const mapSessionPlayerPublic = (
	row: Record<string, unknown>,
	userId: string
): SessionPlayerPublic => ({
	id: row.id as string,
	user_id: row.user_id as string,
	status: row.status as SessionPlayerPublic['status'],
	joined_at: row.joined_at as string,
	profile: normalizeRelation(
		row.profile as SessionPlayerPublic['profile'] | SessionPlayerPublic['profile'][]
	),
	is_me: row.user_id === userId
});

const loadSessionRoster = async (
	supabase: SupabaseClient,
	sessionId: string,
	userId: string
): Promise<{
	waiting: SessionPlayerPublic[];
	queued: SessionPlayerPublic[];
	confirmed: SessionPlayerPublic[];
}> => {
	const empty = { waiting: [], queued: [], confirmed: [] };

	const { data, error } = await supabase
		.from('session_players')
		.select(rosterSelect)
		.eq('session_id', sessionId)
		.in('status', ['waiting', 'queued', 'confirmed'])
		.order('joined_at', { ascending: true });

	if (error) {
		console.error('Failed to load session roster', error);
		return empty;
	}

	const waiting: SessionPlayerPublic[] = [];
	const queued: SessionPlayerPublic[] = [];
	const confirmed: SessionPlayerPublic[] = [];

	for (const row of data ?? []) {
		const player = mapSessionPlayerPublic(row as Record<string, unknown>, userId);
		if (player.status === 'waiting') waiting.push(player);
		else if (player.status === 'queued') queued.push(player);
		else if (player.status === 'confirmed') confirmed.push(player);
	}

	return { waiting, queued, confirmed };
};

export const hasOutstandingCancellationFee = async (
	supabase: SupabaseClient,
	userId: string
): Promise<boolean> => {
	const { count, error } = await supabase
		.from('session_players')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', userId)
		.gt('fee_owed', 0);

	if (error) {
		console.error('Failed to check outstanding fees', error);
		return false;
	}

	return (count ?? 0) > 0;
};

export const loadUpcomingSessionsForPlayer = async (
	supabase: SupabaseClient,
	userId: string
): Promise<SessionListItem[]> => {
	const now = new Date().toISOString();

	const { data, error } = await supabase
		.from('sessions')
		.select(sessionListSelect)
		.in('status', ['open', 'in_progress'])
		.gte('end_at', now)
		.order('start_at', { ascending: true });

	if (error) {
		console.error('Failed to load sessions', error);
		return [];
	}

	const rows = data ?? [];
	const sessionIds = rows.map((row) => row.id as string);
	const [counts, memberships] = await Promise.all([
		loadMembershipCounts(supabase, sessionIds),
		loadMyMemberships(supabase, userId, sessionIds)
	]);

	return rows.map((row) => {
		const sessionId = row.id as string;
		const count = counts.get(sessionId) ?? { waiting: 0, queued: 0, confirmed: 0 };

		return {
			...(row as Omit<SessionListItem, 'club' | 'waiting_count' | 'queued_count' | 'my_membership'>),
			club: normalizeRelation(row.club as SessionListItem['club'] | SessionListItem['club'][]),
			waiting_count: count.waiting + count.confirmed,
			queued_count: count.queued,
			my_membership: memberships.get(sessionId) ?? null
		};
	});
};

export const loadSessionDetailForPlayer = async (
	supabase: SupabaseClient,
	sessionId: string,
	userId: string
): Promise<SessionDetail | null> => {
	const { data, error } = await supabase
		.from('sessions')
		.select(sessionDetailSelect)
		.eq('id', sessionId)
		.maybeSingle();

	if (error) {
		console.error('Failed to load session detail', error);
		return null;
	}

	if (!data) return null;

	const counts = await loadMembershipCounts(supabase, [sessionId]);
	const memberships = await loadMyMemberships(supabase, userId, [sessionId]);
	const count = counts.get(sessionId) ?? { waiting: 0, queued: 0, confirmed: 0 };
	const hasOutstandingFee = await hasOutstandingCancellationFee(supabase, userId);
	const myMembership = memberships.get(sessionId) ?? null;
	const roster =
		myMembership !== null
			? await loadSessionRoster(supabase, sessionId, userId)
			: { waiting: [], queued: [], confirmed: [] };

	return {
		...(data as Omit<
			SessionDetail,
			| 'club'
			| 'host'
			| 'shuttle'
			| 'waiting_count'
			| 'queued_count'
			| 'confirmed_count'
			| 'my_membership'
			| 'has_outstanding_fee'
			| 'waiting_players'
			| 'queued_players'
			| 'confirmed_players'
		>),
		club: normalizeRelation(data.club as SessionDetail['club'] | SessionDetail['club'][]),
		host: normalizeRelation(data.host as SessionDetail['host'] | SessionDetail['host'][]),
		shuttle: normalizeRelation(data.shuttle as SessionDetail['shuttle'] | SessionDetail['shuttle'][]),
		waiting_count: count.waiting + count.confirmed,
		queued_count: count.queued,
		confirmed_count: count.confirmed,
		my_membership: myMembership,
		has_outstanding_fee: hasOutstandingFee,
		waiting_players: roster.waiting,
		queued_players: roster.queued,
		confirmed_players: roster.confirmed
	};
};

export const joinSession = async (
	supabase: SupabaseClient,
	sessionId: string
): Promise<{ ok: true; status: SessionPlayerStatus } | { ok: false; message: string }> => {
	const { data, error } = await supabase.rpc('join_session', { p_session_id: sessionId });

	if (error) {
		return { ok: false, message: error.message };
	}

	const row = data as SessionPlayerRow;
	return { ok: true, status: row.status };
};

export const cancelSessionMembership = async (
	supabase: SupabaseClient,
	sessionId: string
): Promise<{ ok: true; feeOwed: number } | { ok: false; message: string }> => {
	const { data, error } = await supabase.rpc('cancel_session_membership', {
		p_session_id: sessionId
	});

	if (error) {
		return { ok: false, message: error.message };
	}

	const row = data as SessionPlayerRow;
	return { ok: true, feeOwed: Number(row.fee_owed) };
};

export const leaveSession = async (
	supabase: SupabaseClient,
	sessionId: string
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('leave_session', { p_session_id: sessionId });

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};
