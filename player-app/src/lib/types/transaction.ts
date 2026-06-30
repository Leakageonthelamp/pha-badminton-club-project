import type { CancellationFeeStatus, PaymentStatus } from '@repo/ui/payments';
import type { TransactionFilterStatus, TransactionKind } from '@repo/ui/transactions';

export type PlayerTransactionKind = TransactionKind;

export type PlayerTransactionFilterStatus = TransactionFilterStatus;

export type PlayerTransaction = {
	id: string;
	kind: PlayerTransactionKind;
	record_id: string;
	session_id: string;
	session_name: string;
	club_name: string;
	amount: number;
	status: PaymentStatus | CancellationFeeStatus;
	filter_status: Exclude<PlayerTransactionFilterStatus, ''>;
	occurred_at: string;
	session_start_at: string;
	slip_path: string | null;
};

export type PlayerTransactionPage = {
	items: PlayerTransaction[];
	page: number;
	totalCount: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
	statusFilter: PlayerTransactionFilterStatus;
	date: string;
};
