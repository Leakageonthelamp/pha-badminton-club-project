import type { AdminTransaction } from '$lib/types/transaction';
import type { CancellationFeeStatus, PaymentStatus } from '@repo/ui/payments';
import {
	cancellationFilterStatus,
	paymentFilterStatus
} from '@repo/ui/transactions';
import type { SupabaseClient } from '@supabase/supabase-js';

type SessionEmbed = {
	name: string;
	start_at: string;
	club_id: string;
	club: { name: string } | { name: string }[] | null;
};

type ProfileEmbed = {
	id: string;
	display_name: string;
	tag: string | null;
};

const normalizeRelation = <T>(value: T | T[] | null | undefined): T | null => {
	if (Array.isArray(value)) {
		return value[0] ?? null;
	}

	return value ?? null;
};

const sessionContext = (session: SessionEmbed | null) => {
	if (!session) {
		return {
			session_name: 'Session',
			session_start_at: new Date(0).toISOString(),
			club_id: '',
			club_name: 'Club session'
		};
	}

	const club = normalizeRelation(session.club);

	return {
		session_name: session.name,
		session_start_at: session.start_at,
		club_id: session.club_id,
		club_name: club?.name ?? 'Club session'
	};
};

const profileContext = (profile: ProfileEmbed | null, userId: string) => ({
	player_id: profile?.id ?? userId,
	player_name: profile?.display_name ?? 'Player',
	player_tag: profile?.tag ?? null
});

const inClubScope = (clubId: string, clubIds?: string[]): boolean =>
	!clubIds?.length || clubIds.includes(clubId);

const mapPaymentRow = (row: Record<string, unknown>): AdminTransaction | null => {
	const session = normalizeRelation(row.session as SessionEmbed | SessionEmbed[] | null);
	const context = sessionContext(session);
	const profile = normalizeRelation(
		row.profile as ProfileEmbed | ProfileEmbed[] | null
	);
	const status = row.status as PaymentStatus;

	return {
		id: `session_fee:${row.id as string}`,
		kind: 'session_fee',
		record_id: row.id as string,
		session_id: row.session_id as string,
		...context,
		...profileContext(profile, row.user_id as string),
		amount: Number(row.total_amount),
		status,
		filter_status: paymentFilterStatus(status),
		occurred_at: (row.updated_at as string) ?? (row.created_at as string)
	};
};

const mapCancellationRow = (row: Record<string, unknown>): AdminTransaction | null => {
	const session = normalizeRelation(row.session as SessionEmbed | SessionEmbed[] | null);
	const context = sessionContext(session);
	const profile = normalizeRelation(
		row.profile as ProfileEmbed | ProfileEmbed[] | null
	);
	const status = row.fee_status as CancellationFeeStatus;
	const filterStatus = cancellationFilterStatus(status);

	if (!filterStatus) {
		return null;
	}

	return {
		id: `cancellation_fee:${row.id as string}`,
		kind: 'cancellation_fee',
		record_id: row.id as string,
		session_id: row.session_id as string,
		...context,
		...profileContext(profile, row.user_id as string),
		amount: Number(row.fee_owed),
		status,
		filter_status: filterStatus,
		occurred_at:
			(row.fee_paid_at as string | null) ??
			(row.updated_at as string) ??
			(row.created_at as string)
	};
};

const paymentSelect = `
	id,
	session_id,
	user_id,
	total_amount,
	status,
	created_at,
	updated_at,
	profile:profiles!payments_user_id_fkey ( id, display_name, tag ),
	session:sessions ( name, start_at, club_id, club:clubs ( name ) )
`;

const cancellationSelect = `
	id,
	session_id,
	user_id,
	fee_owed,
	fee_status,
	created_at,
	updated_at,
	fee_paid_at,
	profile:profiles!session_players_user_id_fkey ( id, display_name, tag ),
	session:sessions ( name, start_at, club_id, club:clubs ( name ) )
`;

/** ponytail: loads all rows in scope (no DB pagination); fine for club volumes — upgrade to a view/pagination if it grows */
export const loadAdminTransactions = async (
	supabase: SupabaseClient,
	options: { clubIds?: string[] } = {}
): Promise<AdminTransaction[]> => {
	const clubIds = options.clubIds;

	const [{ data: payments, error: paymentsError }, { data: cancellations, error: cancellationsError }] =
		await Promise.all([
			supabase
				.from('payments')
				.select(paymentSelect)
				.order('updated_at', { ascending: false }),
			supabase
				.from('session_players')
				.select(cancellationSelect)
				.gt('fee_owed', 0)
				.not('fee_status', 'eq', 'none')
				.order('updated_at', { ascending: false })
		]);

	if (paymentsError) {
		console.error('Failed to load session fee transactions', paymentsError);
	}

	if (cancellationsError) {
		console.error('Failed to load cancellation fee transactions', cancellationsError);
	}

	return [
		...(payments ?? []).flatMap((row) => {
			const transaction = mapPaymentRow(row as Record<string, unknown>);
			if (!transaction || !inClubScope(transaction.club_id, clubIds)) {
				return [];
			}
			return [transaction];
		}),
		...(cancellations ?? []).flatMap((row) => {
			const transaction = mapCancellationRow(row as Record<string, unknown>);
			if (!transaction || !inClubScope(transaction.club_id, clubIds)) {
				return [];
			}
			return [transaction];
		})
	].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
};
