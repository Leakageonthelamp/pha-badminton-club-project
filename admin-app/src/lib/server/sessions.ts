import type { AppRole } from '$lib/types/auth';
import type { SessionDetail, SessionListItem } from '$lib/types/session';
import type { SupabaseClient } from '@supabase/supabase-js';

const normalizeRelation = <T>(value: T | T[] | null | undefined): T | null => {
	if (Array.isArray(value)) {
		return value[0] ?? null;
	}

	return value ?? null;
};

const mapSessionListItem = (row: Record<string, unknown>): SessionListItem => ({
	...(row as Omit<SessionListItem, 'club' | 'host'>),
	club: normalizeRelation(row.club as SessionListItem['club'] | SessionListItem['club'][]),
	host: normalizeRelation(row.host as SessionListItem['host'] | SessionListItem['host'][])
});

const mapSessionDetail = (row: Record<string, unknown>): SessionDetail => ({
	...mapSessionListItem(row),
	shuttle: normalizeRelation(
		row.shuttle as SessionDetail['shuttle'] | SessionDetail['shuttle'][]
	)
});

const sessionListSelect = `
	id,
	club_id,
	host_id,
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
	shuttle_id,
	shuttle_price_per_each,
	match_score_type,
	match_type,
	cancellation_fee,
	max_buffer,
	created_at,
	updated_at,
	club:clubs ( id, name ),
	host:profiles!sessions_host_id_fkey ( id, display_name, tag )
`;

const sessionDetailSelect = `
	${sessionListSelect},
	shuttle:club_shuttles ( id, name, speed, price, number_per_box )
`;

export const loadSessionsForAdmin = async (
	supabase: SupabaseClient,
	options: {
		appRole: AppRole;
		userId: string;
		clubIds?: string[];
	}
): Promise<SessionListItem[]> => {
	let query = supabase
		.from('sessions')
		.select(sessionListSelect)
		.order('start_at', { ascending: true });

	if (options.clubIds?.length) {
		query = query.in('club_id', options.clubIds);
	}

	const { data, error } = await query;

	if (error) {
		console.error('Failed to load sessions', error);
		return [];
	}

	return (data ?? []).map((row) => mapSessionListItem(row as Record<string, unknown>));
};

export const loadSessionDetail = async (
	supabase: SupabaseClient,
	sessionId: string
): Promise<SessionDetail | null> => {
	const { data, error } = await supabase
		.from('sessions')
		.select(sessionDetailSelect)
		.eq('id', sessionId)
		.maybeSingle();

	if (error) {
		console.error('Failed to load session', error);
		return null;
	}

	if (!data) {
		return null;
	}

	return mapSessionDetail(data as Record<string, unknown>);
};

export const countActiveClubSessions = async (
	supabase: SupabaseClient,
	clubId: string
): Promise<number> => {
	const { count, error } = await supabase
		.from('sessions')
		.select('*', { count: 'exact', head: true })
		.eq('club_id', clubId)
		.in('status', ['open', 'in_progress']);

	if (error) {
		console.error('Failed to count active sessions', error);
		return 0;
	}

	return count ?? 0;
};
