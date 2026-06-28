export type PaymentStatus = 'pending' | 'submitted' | 'approved';

export type SessionPayment = {
	id: string;
	session_id: string;
	user_id: string;
	court_share: number;
	shuttle_share: number;
	total_amount: number;
	status: PaymentStatus;
	decided_by: string | null;
	decided_at: string | null;
	created_at: string;
	updated_at: string;
};

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type SessionLeaveRequest = {
	id: string;
	session_id: string;
	user_id: string;
	status: LeaveRequestStatus;
	requested_at: string;
	decided_by: string | null;
	decided_at: string | null;
	created_at: string;
	updated_at: string;
};

export type ClubPromptPay = {
	promptpay_type: 'phone' | 'national_id' | null;
	promptpay_target: string | null;
};
