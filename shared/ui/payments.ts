export type CourtShareInput = {
	courtFeePerHour: number;
	startAt: string;
	endAt: string;
	courtCount: number;
	activePlayers: number;
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

	const startMs = new Date(startAt).getTime();
	const endMs = new Date(endAt).getTime();
	if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return 0;

	const durationHours = (endMs - startMs) / (1000 * 60 * 60);
	const courtTotal = courtFeePerHour * durationHours * courtCount;

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
