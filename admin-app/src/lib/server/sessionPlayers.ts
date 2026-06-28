import type { SessionPlayerWithProfile } from '$lib/types/session';
import type { SupabaseClient } from '@supabase/supabase-js';

const playerSelect = `
	id,
	session_id,
	user_id,
	status,
	fee_owed,
	fee_status,
	fee_paid_at,
	joined_at,
	decided_at,
	left_at,
	created_at,
	updated_at,
	profile:profiles!session_players_user_id_fkey ( id, display_name, tag, avatar_url )
`;

const normalizeRelation = <T>(value: T | T[] | null | undefined): T | null => {
	if (Array.isArray(value)) {
		return value[0] ?? null;
	}

	return value ?? null;
};

export const loadSessionPlayers = async (
	supabase: SupabaseClient,
	sessionId: string
): Promise<SessionPlayerWithProfile[]> => {
	const { data, error } = await supabase
		.from('session_players')
		.select(playerSelect)
		.eq('session_id', sessionId)
		.in('status', ['waiting', 'queued', 'confirmed'])
		.order('joined_at', { ascending: true });

	if (error) {
		console.error('Failed to load session players', error);
		return [];
	}

	return (data ?? []).map((row) => ({
		...(row as Omit<SessionPlayerWithProfile, 'profile'>),
		profile: normalizeRelation(
			row.profile as SessionPlayerWithProfile['profile'] | SessionPlayerWithProfile['profile'][]
		)
	}));
};

export const loadSessionPlayerHistory = async (
	supabase: SupabaseClient,
	sessionId: string
): Promise<SessionPlayerWithProfile[]> => {
	const { data, error } = await supabase
		.from('session_players')
		.select(playerSelect)
		.eq('session_id', sessionId)
		.order('joined_at', { ascending: true });

	if (error) {
		console.error('Failed to load session player history', error);
		return [];
	}

	return (data ?? []).map((row) => ({
		...(row as Omit<SessionPlayerWithProfile, 'profile'>),
		profile: normalizeRelation(
			row.profile as SessionPlayerWithProfile['profile'] | SessionPlayerWithProfile['profile'][]
		)
	}));
};

export const confirmSessionPlayer = async (
	supabase: SupabaseClient,
	playerId: string
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('confirm_session_player', { p_player_id: playerId });

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};

export const rejectSessionPlayer = async (
	supabase: SupabaseClient,
	playerId: string
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('reject_session_player', { p_player_id: playerId });

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};

export const loadSessionCancellationFees = async (
	supabase: SupabaseClient,
	sessionId: string
): Promise<SessionPlayerWithProfile[]> => {
	const { data, error } = await supabase
		.from('session_players')
		.select(playerSelect)
		.eq('session_id', sessionId)
		.gt('fee_owed', 0)
		.order('updated_at', { ascending: false });

	if (error) {
		console.error('Failed to load session cancellation fees', error);
		return [];
	}

	return (data ?? []).map((row) => ({
		...(row as Omit<SessionPlayerWithProfile, 'profile'>),
		profile: normalizeRelation(
			row.profile as SessionPlayerWithProfile['profile'] | SessionPlayerWithProfile['profile'][]
		)
	}));
};

export const confirmCancellationFee = async (
	supabase: SupabaseClient,
	playerId: string
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('confirm_cancellation_fee', { p_player_id: playerId });

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};

export const waiveCancellationFee = async (
	supabase: SupabaseClient,
	playerId: string
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('waive_cancellation_fee', { p_player_id: playerId });

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};

export const isAdminActionWindowOpen = (startAt: string, endAt: string): boolean => {
	const now = Date.now();
	const start = new Date(startAt).getTime();
	const end = new Date(endAt).getTime();
	const windowOpens = start - 15 * 60 * 1000;
	return now >= windowOpens && now <= end;
};

export const loadOutstandingCancellationFeeCountsBySession = async (
	supabase: SupabaseClient,
	sessionIds: string[]
): Promise<Record<string, number>> => {
	if (sessionIds.length === 0) {
		return {};
	}

	const { data, error } = await supabase
		.from('session_players')
		.select('session_id')
		.in('session_id', sessionIds)
		.gt('fee_owed', 0)
		.in('fee_status', ['owed', 'submitted']);

	if (error) {
		console.error('Failed to load outstanding cancellation fee counts', error);
		return {};
	}

	const counts: Record<string, number> = {};
	for (const row of data ?? []) {
		counts[row.session_id] = (counts[row.session_id] ?? 0) + 1;
	}

	return counts;
};
