import type {
	ClubPromptPay,
	SessionLeaveRequest,
	SessionPayment
} from '$lib/types/payment';
import type {
	SessionDetail,
	SessionListItem,
	SessionPlayerMembership,
	SessionPlayerPublic,
	SessionPlayerStatus,
	OutstandingFee
} from '$lib/types/session';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureSupabaseAuth } from '$lib/server/supabaseAuth';
import { computeCourtShare } from '@repo/ui/payments';
import type { CancellationFeeStatus } from '@repo/ui/payments';

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
	promptpay_type,
	promptpay_target,
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
	fee_status: CancellationFeeStatus;
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
	sessionIds: string[],
	statuses: SessionPlayerStatus[] = ['waiting', 'queued', 'confirmed']
): Promise<Map<string, SessionPlayerMembership>> => {
	const map = new Map<string, SessionPlayerMembership>();

	if (!sessionIds.length) return map;

	const { data, error } = await supabase
		.from('session_players')
		.select('id, session_id, status, fee_owed, fee_status, joined_at')
		.eq('user_id', userId)
		.in('session_id', sessionIds)
		.in('status', statuses);

	if (error) {
		console.error('Failed to load my session memberships', error);
		return map;
	}

	for (const row of data ?? []) {
		map.set(row.session_id, {
			id: row.id,
			status: row.status as SessionPlayerStatus,
			fee_owed: Number(row.fee_owed),
			fee_status: row.fee_status as CancellationFeeStatus,
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
	profile:profiles!session_players_user_id_fkey ( display_name, tag, avatar_url )
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
		.gt('fee_owed', 0)
		.in('fee_status', ['owed', 'submitted']);

	if (error) {
		console.error('Failed to check outstanding fees', error);
		return false;
	}

	return (count ?? 0) > 0;
};

/** ponytail: lazy fallback when pg_cron is unavailable (local dev). */
export const sweepStartedSessions = async (supabase: SupabaseClient): Promise<void> => {
	const { error } = await supabase.rpc('start_due_sessions');

	if (error) {
		console.error('Failed to sweep started sessions', error);
	}
};

export const loadUpcomingSessionsForPlayer = async (
	supabase: SupabaseClient,
	userId: string
): Promise<SessionListItem[]> => {
	await sweepStartedSessions(supabase);

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

	const authReady = await ensureSupabaseAuth(supabase);
	const [counts, memberships] = authReady
		? await Promise.all([
				loadMembershipCounts(supabase, sessionIds),
				loadMyMemberships(supabase, userId, sessionIds)
			])
		: [new Map<string, { waiting: number; queued: number; confirmed: number }>(), new Map<string, SessionPlayerMembership>()];

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
	await sweepStartedSessions(supabase);

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

	const authReady = await ensureSupabaseAuth(supabase);
	const counts = authReady
		? await loadMembershipCounts(supabase, [sessionId])
		: new Map<string, { waiting: number; queued: number; confirmed: number }>();
	const memberships = authReady
		? await loadMyMemberships(supabase, userId, [sessionId])
		: new Map<string, SessionPlayerMembership>();
	const count = counts.get(sessionId) ?? { waiting: 0, queued: 0, confirmed: 0 };
	const hasOutstandingFee = authReady
		? await hasOutstandingCancellationFee(supabase, userId)
		: false;
	const myMembership = memberships.get(sessionId) ?? null;
	const roster =
		authReady && myMembership !== null
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

const loadSessionDetailForLive = async (
	supabase: SupabaseClient,
	sessionId: string,
	userId: string
): Promise<SessionDetail | null> => {
	const session = await loadSessionDetailForPlayer(supabase, sessionId, userId);
	if (!session) return null;

	if (session.my_membership) return session;

	await ensureSupabaseAuth(supabase);
	const leftMemberships = await loadMyMemberships(supabase, userId, [sessionId], ['left']);
	const leftMembership = leftMemberships.get(sessionId) ?? null;

	if (!leftMembership) return session;

	return { ...session, my_membership: leftMembership };
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
): Promise<
	{ ok: true; feeOwed: number; playerId: string; feeStatus: CancellationFeeStatus } | { ok: false; message: string }
> => {
	const { data, error } = await supabase.rpc('cancel_session_membership', {
		p_session_id: sessionId
	});

	if (error) {
		return { ok: false, message: error.message };
	}

	const row = data as SessionPlayerRow;
	return {
		ok: true,
		feeOwed: Number(row.fee_owed),
		playerId: row.id,
		feeStatus: row.fee_status
	};
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

export type LiveSessionData = {
	session: SessionDetail;
	activePlayers: SessionPlayerPublic[];
	myPayment: SessionPayment | null;
	myLeaveRequest: SessionLeaveRequest | null;
	perPlayerCost: number;
	activePlayerCount: number;
	clubPromptPay: ClubPromptPay;
	settlementStarted: boolean;
};

const mapPaymentRow = (row: Record<string, unknown>): SessionPayment => ({
	id: row.id as string,
	session_id: row.session_id as string,
	user_id: row.user_id as string,
	court_share: Number(row.court_share),
	shuttle_share: Number(row.shuttle_share),
	total_amount: Number(row.total_amount),
	status: row.status as SessionPayment['status'],
	decided_by: (row.decided_by as string | null) ?? null,
	decided_at: (row.decided_at as string | null) ?? null,
	created_at: row.created_at as string,
	updated_at: row.updated_at as string
});

const mapLeaveRequestRow = (row: Record<string, unknown>): SessionLeaveRequest => ({
	id: row.id as string,
	session_id: row.session_id as string,
	user_id: row.user_id as string,
	status: row.status as SessionLeaveRequest['status'],
	requested_at: row.requested_at as string,
	decided_by: (row.decided_by as string | null) ?? null,
	decided_at: (row.decided_at as string | null) ?? null,
	created_at: row.created_at as string,
	updated_at: row.updated_at as string
});

const loadClubPromptPay = async (
	supabase: SupabaseClient,
	clubId: string
): Promise<ClubPromptPay> => {
	const { data, error } = await supabase
		.from('clubs')
		.select('promptpay_type, promptpay_target')
		.eq('id', clubId)
		.maybeSingle();

	if (error || !data) {
		console.error('Failed to load club PromptPay settings', error);
		return { promptpay_type: null, promptpay_target: null };
	}

	return {
		promptpay_type: data.promptpay_type as ClubPromptPay['promptpay_type'],
		promptpay_target: data.promptpay_target
	};
};

const loadSessionPromptPay = async (
	supabase: SupabaseClient,
	session: Pick<SessionDetail, 'club_id' | 'promptpay_type' | 'promptpay_target'>
): Promise<ClubPromptPay> => {
	if (session.promptpay_type && session.promptpay_target?.trim()) {
		return {
			promptpay_type: session.promptpay_type,
			promptpay_target: session.promptpay_target
		};
	}

	return loadClubPromptPay(supabase, session.club_id);
};

const loadMyPayment = async (
	supabase: SupabaseClient,
	sessionId: string,
	userId: string
): Promise<SessionPayment | null> => {
	const { data, error } = await supabase
		.from('payments')
		.select('*')
		.eq('session_id', sessionId)
		.eq('user_id', userId)
		.maybeSingle();

	if (error) {
		console.error('Failed to load my payment', error);
		return null;
	}

	return data ? mapPaymentRow(data as Record<string, unknown>) : null;
};

const loadMyLeaveRequest = async (
	supabase: SupabaseClient,
	sessionId: string,
	userId: string
): Promise<SessionLeaveRequest | null> => {
	const { data, error } = await supabase
		.from('session_leave_requests')
		.select('*')
		.eq('session_id', sessionId)
		.eq('user_id', userId)
		.order('requested_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		console.error('Failed to load my leave request', error);
		return null;
	}

	return data ? mapLeaveRequestRow(data as Record<string, unknown>) : null;
};

const loadActivePlayers = async (
	supabase: SupabaseClient,
	sessionId: string,
	userId: string
): Promise<SessionPlayerPublic[]> => {
	const { data, error } = await supabase
		.from('session_players')
		.select(rosterSelect)
		.eq('session_id', sessionId)
		.eq('status', 'confirmed')
		.order('joined_at', { ascending: true });

	if (error) {
		console.error('Failed to load active players', error);
		return [];
	}

	return (data ?? []).map((row) => mapSessionPlayerPublic(row as Record<string, unknown>, userId));
};

const countActiveSessionPlayers = async (
	supabase: SupabaseClient,
	sessionId: string
): Promise<number> => {
	const { count, error } = await supabase
		.from('session_players')
		.select('*', { count: 'exact', head: true })
		.eq('session_id', sessionId)
		.in('status', ['confirmed', 'left']);

	if (error) {
		console.error('Failed to count active session players', error);
		return 0;
	}

	return count ?? 0;
};

export const loadLiveSessionForPlayer = async (
	supabase: SupabaseClient,
	sessionId: string,
	userId: string
): Promise<LiveSessionData | null> => {
	const session = await loadSessionDetailForLive(supabase, sessionId, userId);
	if (!session) return null;

	await ensureSupabaseAuth(supabase);

	const [activePlayers, myPayment, myLeaveRequest, activePlayerCount, clubPromptPay, settlementCount] =
		await Promise.all([
			loadActivePlayers(supabase, sessionId, userId),
			loadMyPayment(supabase, sessionId, userId),
			loadMyLeaveRequest(supabase, sessionId, userId),
			countActiveSessionPlayers(supabase, sessionId),
			loadSessionPromptPay(supabase, session),
			supabase
				.from('payments')
				.select('*', { count: 'exact', head: true })
				.eq('session_id', sessionId)
		]);

	const perPlayerCost = computeCourtShare({
		courtFeePerHour: session.court_fee_per_hour,
		startAt: session.start_at,
		endAt: session.end_at,
		courtCount: session.court_count,
		activePlayers: activePlayerCount
	});

	return {
		session,
		activePlayers,
		myPayment,
		myLeaveRequest,
		perPlayerCost,
		activePlayerCount,
		clubPromptPay,
		settlementStarted: (settlementCount.count ?? 0) > 0
	};
};

export const requestSessionLeave = async (
	supabase: SupabaseClient,
	sessionId: string
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('request_session_leave', { p_session_id: sessionId });

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};

export const cancelSessionLeave = async (
	supabase: SupabaseClient,
	sessionId: string
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('cancel_session_leave', { p_session_id: sessionId });

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};

export const submitPayment = async (
	supabase: SupabaseClient,
	sessionId: string
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('submit_payment', { p_session_id: sessionId });

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};

export const loadOutstandingFees = async (
	supabase: SupabaseClient,
	userId: string
): Promise<OutstandingFee[]> => {
	const { data, error } = await supabase
		.from('session_players')
		.select(
			`
			id,
			session_id,
			fee_owed,
			fee_status,
			session:sessions (
				name,
				promptpay_target,
				club:clubs ( name )
			)
		`
		)
		.eq('user_id', userId)
		.gt('fee_owed', 0)
		.in('fee_status', ['owed', 'submitted'])
		.order('updated_at', { ascending: false });

	if (error) {
		console.error('Failed to load outstanding fees', error);
		return [];
	}

	return (data ?? []).flatMap((row) => {
		const session = normalizeRelation(
			row.session as unknown as {
				name: string;
				promptpay_target: string | null;
				club: { name: string } | { name: string }[] | null;
			} | null
		);
		if (!session) return [];

		const club = normalizeRelation(session.club);

		return [
			{
				player_id: row.id as string,
				session_id: row.session_id as string,
				session_name: session.name,
				club_name: club?.name ?? 'Club session',
				fee_owed: Number(row.fee_owed),
				fee_status: row.fee_status as CancellationFeeStatus,
				promptpay_target: session.promptpay_target
			}
		];
	});
};

export const submitCancellationFee = async (
	supabase: SupabaseClient,
	playerId: string
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('submit_cancellation_fee', { p_player_id: playerId });

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};
