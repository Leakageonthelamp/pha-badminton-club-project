import type { CancellationFeeStatus, PaymentStatus } from '@repo/ui/payments';
import type {
	PlayerTransaction,
	PlayerTransactionFilterStatus,
	PlayerTransactionPage
} from '$lib/types/transaction';
import {
	cancellationFilterStatus,
	dateFilterBounds,
	filterTransactions,
	paymentFilterStatus,
	TRANSACTION_PAGE_SIZE
} from '$lib/transactions/list';
import type { SupabaseClient } from '@supabase/supabase-js';

type SessionEmbed = {
	name: string;
	start_at: string;
	club: { name: string } | { name: string }[] | null;
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
			club_name: 'Club session',
			session_start_at: new Date(0).toISOString()
		};
	}

	const club = normalizeRelation(session.club);

	return {
		session_name: session.name,
		club_name: club?.name ?? 'Club session',
		session_start_at: session.start_at
	};
};

const mapPaymentRow = (row: Record<string, unknown>): PlayerTransaction | null => {
	const session = normalizeRelation(row.session as SessionEmbed | SessionEmbed[] | null);
	const context = sessionContext(session);
	const status = row.status as PaymentStatus;

	return {
		id: `session_fee:${row.id as string}`,
		kind: 'session_fee',
		record_id: row.id as string,
		session_id: row.session_id as string,
		...context,
		amount: Number(row.total_amount),
		status,
		filter_status: paymentFilterStatus(status),
		occurred_at: (row.updated_at as string) ?? (row.created_at as string),
		slip_path: (row.slip_path as string | null) ?? null
	};
};

const mapCancellationRow = (row: Record<string, unknown>): PlayerTransaction | null => {
	const session = normalizeRelation(row.session as SessionEmbed | SessionEmbed[] | null);
	const context = sessionContext(session);
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
		amount: Number(row.fee_owed),
		status,
		filter_status: filterStatus,
		occurred_at:
			(row.fee_paid_at as string | null) ??
			(row.updated_at as string) ??
			(row.created_at as string),
		slip_path: (row.fee_slip_path as string | null) ?? null
	};
};

export const loadPlayerTransactions = async (
	supabase: SupabaseClient,
	options: {
		userId: string;
		page?: number;
		statusFilter?: PlayerTransactionFilterStatus;
		date?: string;
	}
): Promise<PlayerTransactionPage> => {
	const page = Math.max(1, options.page ?? 1);
	const statusFilter = options.statusFilter ?? '';
	const date = options.date ?? '';

	let paymentsQuery = supabase
		.from('payments')
		.select(
			`
			id,
			session_id,
			total_amount,
			status,
			slip_path,
			created_at,
			updated_at,
			session:sessions ( name, start_at, club:clubs ( name ) )
		`
		)
		.eq('user_id', options.userId)
		.order('updated_at', { ascending: false });

	let cancellationQuery = supabase
		.from('session_players')
		.select(
			`
			id,
			session_id,
			fee_owed,
			fee_status,
			fee_slip_path,
			created_at,
			updated_at,
			fee_paid_at,
			session:sessions ( name, start_at, club:clubs ( name ) )
		`
		)
		.eq('user_id', options.userId)
		.gt('fee_owed', 0)
		.not('fee_status', 'eq', 'none')
		.order('updated_at', { ascending: false });

	const dateBounds = date ? dateFilterBounds(date) : null;
	if (dateBounds) {
		paymentsQuery = paymentsQuery
			.gte('updated_at', dateBounds.fromIso)
			.lte('updated_at', dateBounds.toIso);
		cancellationQuery = cancellationQuery
			.gte('updated_at', dateBounds.fromIso)
			.lte('updated_at', dateBounds.toIso);
	}

	const [{ data: payments, error: paymentsError }, { data: cancellations, error: cancellationsError }] =
		await Promise.all([paymentsQuery, cancellationQuery]);

	if (paymentsError) {
		console.error('Failed to load session fee transactions', paymentsError);
	}

	if (cancellationsError) {
		console.error('Failed to load cancellation fee transactions', cancellationsError);
	}

	const merged = [
		...(payments ?? []).flatMap((row) => {
			const transaction = mapPaymentRow(row as Record<string, unknown>);
			return transaction ? [transaction] : [];
		}),
		...(cancellations ?? []).flatMap((row) => {
			const transaction = mapCancellationRow(row as Record<string, unknown>);
			return transaction ? [transaction] : [];
		})
	].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

	const filtered = filterTransactions(merged, statusFilter);
	const totalCount = filtered.length;
	const from = (page - 1) * TRANSACTION_PAGE_SIZE;

	return {
		items: filtered.slice(from, from + TRANSACTION_PAGE_SIZE),
		page,
		totalCount,
		hasNextPage: from + TRANSACTION_PAGE_SIZE < totalCount,
		hasPrevPage: page > 1,
		statusFilter,
		date
	};
};
