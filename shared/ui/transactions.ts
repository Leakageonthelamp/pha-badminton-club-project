import {
	cancellationFeeStatusLabel,
	paymentStatusLabel,
	type CancellationFeeStatus,
	type PaymentStatus
} from './payments';

export type TransactionKind = 'session_fee' | 'cancellation_fee';

export type TransactionFilterStatus = '' | 'pending' | 'submitted' | 'completed' | 'waived';

export type TransactionForDisplay = {
	kind: TransactionKind;
	status: PaymentStatus | CancellationFeeStatus;
	filter_status: Exclude<TransactionFilterStatus, ''>;
};

export const transactionStatusFilterOptions: { value: TransactionFilterStatus; label: string }[] =
	[
		{ value: '', label: 'All statuses' },
		{ value: 'pending', label: 'Pending payment' },
		{ value: 'submitted', label: 'Awaiting confirmation' },
		{ value: 'completed', label: 'Paid' },
		{ value: 'waived', label: 'Waived' }
	];

export const transactionKindFilterOptions: { value: '' | TransactionKind; label: string }[] = [
	{ value: '', label: 'All types' },
	{ value: 'session_fee', label: 'Session fee' },
	{ value: 'cancellation_fee', label: 'Cancellation fee' }
];

export const transactionKindLabel = (kind: TransactionKind): string =>
	kind === 'session_fee' ? 'Session fee' : 'Cancellation fee';

export const paymentFilterStatus = (
	status: PaymentStatus
): Exclude<TransactionFilterStatus, ''> => {
	switch (status) {
		case 'pending':
			return 'pending';
		case 'submitted':
			return 'submitted';
		case 'approved':
			return 'completed';
	}
};

export const cancellationFilterStatus = (
	status: CancellationFeeStatus
): Exclude<TransactionFilterStatus, ''> | null => {
	switch (status) {
		case 'owed':
			return 'pending';
		case 'submitted':
			return 'submitted';
		case 'paid':
			return 'completed';
		case 'waived':
			return 'waived';
		default:
			return null;
	}
};

export const transactionStatusLabel = (transaction: TransactionForDisplay): string =>
	transaction.kind === 'session_fee'
		? paymentStatusLabel(transaction.status as PaymentStatus)
		: cancellationFeeStatusLabel(transaction.status as CancellationFeeStatus);

export const transactionStatusBadgeClass = (
	filterStatus: Exclude<TransactionFilterStatus, ''>
): string => {
	switch (filterStatus) {
		case 'pending':
			return 'bg-amber-50 text-amber-800 ring-amber-100';
		case 'submitted':
			return 'bg-sky-50 text-sky-700 ring-sky-100';
		case 'completed':
			return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
		case 'waived':
			return 'bg-slate-100 text-slate-600 ring-slate-200';
	}
};

export const transactionKindBadgeClass = (kind: TransactionKind): string =>
	kind === 'session_fee'
		? 'bg-violet-50 text-violet-700 ring-violet-100'
		: 'bg-orange-50 text-orange-700 ring-orange-100';

export const dateFilterStartIso = (date: string): string => `${date}T00:00:00.000Z`;

export const dateFilterEndIso = (date: string): string => `${date}T23:59:59.999Z`;

export const dateFilterBounds = (date: string): { fromIso: string; toIso: string } | null => {
	if (!date) return null;
	return {
		fromIso: dateFilterStartIso(date),
		toIso: dateFilterEndIso(date)
	};
};

export const occurredOnDate = (occurredAt: string, date: string): boolean => {
	if (!date) return true;
	const bounds = dateFilterBounds(date);
	if (!bounds) return true;
	const ms = new Date(occurredAt).getTime();
	return ms >= new Date(bounds.fromIso).getTime() && ms <= new Date(bounds.toIso).getTime();
};
