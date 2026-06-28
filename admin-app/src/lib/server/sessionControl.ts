import type {
	SessionLeaveRequestWithProfile,
	SessionPaymentWithProfile
} from '$lib/types/payment';
import type { SessionPlayerWithProfile } from '$lib/types/session';
import type { SupabaseClient } from '@supabase/supabase-js';

const normalizeRelation = <T>(value: T | T[] | null | undefined): T | null => {
	if (Array.isArray(value)) {
		return value[0] ?? null;
	}

	return value ?? null;
};

const paymentSelect = `
	id,
	session_id,
	user_id,
	court_share,
	shuttle_share,
	total_amount,
	status,
	decided_by,
	decided_at,
	created_at,
	updated_at,
	profile:profiles!payments_user_id_fkey ( id, display_name, tag, avatar_url )
`;

const leaveRequestSelect = `
	id,
	session_id,
	user_id,
	status,
	requested_at,
	decided_by,
	decided_at,
	created_at,
	updated_at,
	profile:profiles!session_leave_requests_user_id_fkey ( id, display_name, tag, avatar_url )
`;

export const loadSessionPayments = async (
	supabase: SupabaseClient,
	sessionId: string
): Promise<SessionPaymentWithProfile[]> => {
	const { data, error } = await supabase
		.from('payments')
		.select(paymentSelect)
		.eq('session_id', sessionId)
		.order('created_at', { ascending: true });

	if (error) {
		console.error('Failed to load session payments', error);
		return [];
	}

	return (data ?? []).map((row) => ({
		...(row as Omit<SessionPaymentWithProfile, 'profile'>),
		court_share: Number(row.court_share),
		shuttle_share: Number(row.shuttle_share),
		total_amount: Number(row.total_amount),
		profile: normalizeRelation(
			row.profile as SessionPaymentWithProfile['profile'] | SessionPaymentWithProfile['profile'][]
		)
	}));
};

export const loadSessionLeaveRequests = async (
	supabase: SupabaseClient,
	sessionId: string
): Promise<SessionLeaveRequestWithProfile[]> => {
	const { data, error } = await supabase
		.from('session_leave_requests')
		.select(leaveRequestSelect)
		.eq('session_id', sessionId)
		.order('requested_at', { ascending: true });

	if (error) {
		console.error('Failed to load session leave requests', error);
		return [];
	}

	return (data ?? []).map((row) => ({
		...(row as Omit<SessionLeaveRequestWithProfile, 'profile'>),
		profile: normalizeRelation(
			row.profile as
				| SessionLeaveRequestWithProfile['profile']
				| SessionLeaveRequestWithProfile['profile'][]
		)
	}));
};

export const countActiveSessionPlayers = (players: SessionPlayerWithProfile[]): number =>
	players.filter((player) => player.status === 'confirmed' || player.status === 'left').length;

export const approvePayment = async (
	supabase: SupabaseClient,
	paymentId: string
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('approve_payment', { p_payment_id: paymentId });

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};

export const approveSessionLeave = async (
	supabase: SupabaseClient,
	requestId: string
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('approve_session_leave', { p_request_id: requestId });

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};

export const rejectSessionLeave = async (
	supabase: SupabaseClient,
	requestId: string
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('reject_session_leave', { p_request_id: requestId });

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};

export const beginSessionSettlement = async (
	supabase: SupabaseClient,
	sessionId: string
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('begin_session_settlement', { p_session_id: sessionId });

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};

export const endSessionEarly = async (
	supabase: SupabaseClient,
	sessionId: string
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('end_session_early', { p_session_id: sessionId });

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};

export const closeSession = async (
	supabase: SupabaseClient,
	sessionId: string
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('close_session', { p_session_id: sessionId });

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};
