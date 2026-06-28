import type { CancellationFeeStatus, PaymentStatus } from '@repo/ui/payments';

export type PlayerTransactionKind = 'session_fee' | 'cancellation_fee';

export type PlayerTransactionFilterStatus =
	| ''
	| 'pending'
	| 'submitted'
	| 'completed'
	| 'waived';

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
