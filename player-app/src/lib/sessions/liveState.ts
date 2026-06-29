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
	paymentStatus: PaymentStatus | null,
	sessionEnded = false
): boolean =>
	!sessionEnded &&
	paymentStatus !== 'approved' &&
	(uiState === 'payment_due' || uiState === 'payment_submitted');

/** True when scheduled end passed, settlement started, or session ended early — play actions lock. */
export const isLiveSessionEnded = ({
	status,
	endAtMs,
	nowMs = Date.now(),
	settlementStarted = false,
	endedEarly = false
}: {
	status: string;
	endAtMs: number;
	nowMs?: number;
	settlementStarted?: boolean;
	endedEarly?: boolean;
}): boolean =>
	status === 'in_progress' &&
	(endedEarly ||
		settlementStarted ||
		(!Number.isNaN(endAtMs) && nowMs >= endAtMs));

export const canRequestEarlyLeave = (
	membership: SessionPlayerMembership | null,
	leaveRequestStatus: LeaveRequestStatus | null,
	sessionEnded = false
): boolean =>
	!sessionEnded &&
	membership?.status === 'confirmed' &&
	leaveRequestStatus !== 'pending' &&
	leaveRequestStatus !== 'approved';
