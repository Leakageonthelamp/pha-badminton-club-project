import { SESSION_DRAFT_OPEN_LEAD_MINUTES } from '$lib/config/session';
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
	),
	cancelled_by_profile: null
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
	finished_at,
	ended_early,
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
	promptpay_type,
	promptpay_target,
	cancel_source,
	cancel_reason,
	cancelled_by,
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

	const session = mapSessionDetail(data as Record<string, unknown>);

	if (session.cancelled_by) {
		const { data: cancelledByProfile } = await supabase
			.from('profiles')
			.select('id, display_name')
			.eq('id', session.cancelled_by)
			.maybeSingle();

		if (cancelledByProfile) {
			session.cancelled_by_profile = cancelledByProfile;
		}
	}

	return session;
};

export const countActiveClubSessions = async (
	supabase: SupabaseClient,
	clubId: string
): Promise<number> => {
	const { count, error } = await supabase
		.from('sessions')
		.select('*', { count: 'exact', head: true })
		.eq('club_id', clubId)
		.in('status', ['draft', 'open', 'in_progress']);

	if (error) {
		console.error('Failed to count active sessions', error);
		return 0;
	}

	return count ?? 0;
};

/** ponytail: lazy sweep on read — stale drafts flip to cancelled when an admin loads sessions. */
export const sweepOverdueDraftSessions = async (
	supabase: SupabaseClient,
	options?: { clubIds?: string[] }
): Promise<void> => {
	const deadline = new Date(Date.now() + SESSION_DRAFT_OPEN_LEAD_MINUTES * 60 * 1000).toISOString();

	let query = supabase
		.from('sessions')
		.update({
			status: 'cancelled',
			cancel_source: 'system',
			cancel_reason:
				'Draft was not opened at least 1 hour before start.',
			cancelled_by: null
		})
		.eq('status', 'draft')
		.lte('start_at', deadline);

	if (options?.clubIds?.length) {
		query = query.in('club_id', options.clubIds);
	}

	const { error } = await query;

	if (error) {
		console.error('Failed to sweep overdue draft sessions', error);
	}
};

/** ponytail: lazy fallback when pg_cron is unavailable (local dev). */
export const sweepStartedSessions = async (supabase: SupabaseClient): Promise<void> => {
	const { error } = await supabase.rpc('start_due_sessions');

	if (error) {
		console.error('Failed to sweep started sessions', error);
	}
};

export const loadShuttlesForClubs = async (
	supabase: SupabaseClient,
	clubIds: string[]
) => {
	if (!clubIds.length) return [];

	const { data, error } = await supabase
		.from('club_shuttles')
		.select('id, club_id, name, speed, price, number_per_box')
		.in('club_id', clubIds)
		.order('name', { ascending: true });

	if (error) {
		console.error('Failed to load club shuttles', error);
		return [];
	}

	return data ?? [];
};

export const releaseActiveSessionPlayers = async (
	supabase: SupabaseClient,
	sessionId: string
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('release_active_session_players', {
		p_session_id: sessionId
	});

	if (error) {
		console.error('Failed to release session players', error);
		return { ok: false, message: error.message };
	}

	return { ok: true };
};
