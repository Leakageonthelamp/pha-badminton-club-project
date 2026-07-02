import {
	cancellationFeeStatusLabel,
	paymentStatusLabel,
	type CancellationFeeStatus,
	type PaymentStatus
} from './payments';
import { t, tForLocale, type Locale } from './i18n/i18n.svelte';

export type TransactionKind = 'session_fee' | 'cancellation_fee';

export type TransactionFilterStatus = '' | 'pending' | 'submitted' | 'completed' | 'waived';

export type TransactionForDisplay = {
	kind: TransactionKind;
	status: PaymentStatus | CancellationFeeStatus;
	filter_status: Exclude<TransactionFilterStatus, ''>;
};

export const transactionStatusFilterOptions = (
	locale?: Locale
): { value: TransactionFilterStatus; label: string }[] => {
	const tr = (key: string) => (locale ? tForLocale(locale, key) : t(key));
	return [
		{ value: '', label: tr('transaction.allStatuses') },
		{ value: 'pending', label: tr('payment.pending') },
		{ value: 'submitted', label: tr('payment.awaitingConfirmation') },
		{ value: 'completed', label: tr('payment.paid') },
		{ value: 'waived', label: tr('payment.waived') }
	];
};

export const transactionKindFilterOptions = (
	locale?: Locale
): { value: '' | TransactionKind; label: string }[] => {
	const tr = (key: string) => (locale ? tForLocale(locale, key) : t(key));
	return [
		{ value: '', label: tr('transaction.allTypes') },
		{ value: 'session_fee', label: tr('transaction.sessionFee') },
		{ value: 'cancellation_fee', label: tr('transaction.cancellationFee') }
	];
};

export const transactionKindLabel = (kind: TransactionKind, locale?: Locale): string => {
	const tr = (key: string) => (locale ? tForLocale(locale, key) : t(key));
	return kind === 'session_fee' ? tr('transaction.sessionFee') : tr('transaction.cancellationFee');
};

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

export const transactionStatusLabel = (
	transaction: TransactionForDisplay,
	locale?: Locale
): string =>
	transaction.kind === 'session_fee'
		? paymentStatusLabel(transaction.status as PaymentStatus, locale)
		: cancellationFeeStatusLabel(transaction.status as CancellationFeeStatus, locale);

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
