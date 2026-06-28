import type { PaymentStatus, LeaveRequestStatus } from '$lib/types/payment';
import type { SessionPlayerMembership, SessionPlayerStatus } from '$lib/types/session';

export type LiveSessionUiState =
	| 'active'
	| 'leave_pending'
	| 'payment_due'
	| 'payment_submitted'
	| 'awaiting_leave'
	| 'summary';

type LiveStateInput = {
	membershipStatus: SessionPlayerStatus | null;
	leaveRequestStatus: LeaveRequestStatus | null;
	paymentStatus: PaymentStatus | null;
	sessionClosed: boolean;
};

export const deriveLiveSessionUiState = ({
	membershipStatus,
	leaveRequestStatus,
	paymentStatus,
	sessionClosed
}: LiveStateInput): LiveSessionUiState => {
	if (membershipStatus === 'left' || leaveRequestStatus === 'approved' || sessionClosed) {
		return 'summary';
	}

	if (paymentStatus === 'submitted') {
		return leaveRequestStatus === 'pending' ? 'awaiting_leave' : 'payment_submitted';
	}

	if (paymentStatus === 'approved' && leaveRequestStatus === 'pending') {
		return 'awaiting_leave';
	}

	if (paymentStatus === 'pending') {
		return 'payment_due';
	}

	if (leaveRequestStatus === 'pending') {
		return 'leave_pending';
	}

	return 'active';
};

/** Payment QR modal — only while the player still needs to pay or wait for admin to confirm. */
export const shouldShowPaymentModal = (
	uiState: LiveSessionUiState,
	paymentStatus: PaymentStatus | null
): boolean =>
	paymentStatus !== 'approved' && (uiState === 'payment_due' || uiState === 'payment_submitted');

export const canRequestEarlyLeave = (
	membership: SessionPlayerMembership | null,
	leaveRequestStatus: LeaveRequestStatus | null
): boolean =>
	membership?.status === 'confirmed' &&
	leaveRequestStatus !== 'pending' &&
	leaveRequestStatus !== 'approved';
