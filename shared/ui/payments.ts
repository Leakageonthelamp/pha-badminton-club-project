export type CourtShareInput = {
	courtFeePerHour: number;
	startAt: string;
	endAt: string;
	courtCount: number;
	activePlayers: number;
};

export type CourtTotalInput = Omit<CourtShareInput, 'activePlayers'>;

/** Full session court cost before splitting across players. */
export const computeCourtTotal = ({
	courtFeePerHour,
	startAt,
	endAt,
	courtCount
}: CourtTotalInput): number => {
	const startMs = new Date(startAt).getTime();
	const endMs = new Date(endAt).getTime();
	if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return 0;

	const durationHours = (endMs - startMs) / (1000 * 60 * 60);
	return Math.round(courtFeePerHour * durationHours * courtCount * 100) / 100;
};

/** Even split of full session court cost across active players (confirmed + left). */
export const computeCourtShare = ({
	courtFeePerHour,
	startAt,
	endAt,
	courtCount,
	activePlayers
}: CourtShareInput): number => {
	if (activePlayers <= 0) return 0;

	const courtTotal = computeCourtTotal({ courtFeePerHour, startAt, endAt, courtCount });
	return Math.round((courtTotal / activePlayers) * 100) / 100;
};

export const formatThb = (amount: number): string =>
	new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);

export type PaymentStatus = 'pending' | 'submitted' | 'approved';

export const paymentStatusLabel = (status: PaymentStatus): string => {
	switch (status) {
		case 'pending':
			return 'Pending payment';
		case 'submitted':
			return 'Awaiting confirmation';
		case 'approved':
			return 'Paid';
	}
};

export type CancellationFeeStatus = 'none' | 'owed' | 'submitted' | 'paid' | 'waived';

export const isOutstandingCancellationFee = (
	feeOwed: number,
	feeStatus: CancellationFeeStatus
): boolean => feeOwed > 0 && (feeStatus === 'owed' || feeStatus === 'submitted');

export const cancellationFeeStatusLabel = (status: CancellationFeeStatus): string => {
	switch (status) {
		case 'none':
			return 'No fee';
		case 'owed':
			return 'Payment due';
		case 'submitted':
			return 'Awaiting confirmation';
		case 'paid':
			return 'Paid';
		case 'waived':
			return 'Waived';
	}
};

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export const leaveRequestStatusLabel = (status: LeaveRequestStatus): string => {
	switch (status) {
		case 'pending':
			return 'Pending approval';
		case 'approved':
			return 'Approved';
		case 'rejected':
			return 'Rejected';
		case 'cancelled':
			return 'Cancelled';
	}
};
