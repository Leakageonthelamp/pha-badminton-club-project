import type { CancellationFeeStatus, PaymentStatus } from '@repo/ui/payments';
import type { TransactionFilterStatus, TransactionKind } from '@repo/ui/transactions';

export type AdminTransaction = {
	id: string;
	kind: TransactionKind;
	record_id: string;
	session_id: string;
	session_name: string;
	session_start_at: string;
	club_id: string;
	club_name: string;
	player_id: string;
	player_name: string;
	player_tag: string | null;
	amount: number;
	status: PaymentStatus | CancellationFeeStatus;
	filter_status: Exclude<TransactionFilterStatus, ''>;
	occurred_at: string;
	slip_path: string | null;
};
