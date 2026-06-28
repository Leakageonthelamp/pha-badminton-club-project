export type SessionStatus = 'draft' | 'open' | 'in_progress' | 'closed' | 'cancelled';
export type MatchScoreType = 15 | 21;
export type MatchType = 'one_round' | 'two_round';

import type { CancellationFeeStatus } from '@repo/ui/payments';
import type { PlayerActivity } from '@repo/ui/sessionStatus';

export type SessionPlayerStatus =
	| 'waiting'
	| 'queued'
	| 'confirmed'
	| 'rejected'
	| 'cancelled'
	| 'left';

export type SessionPublic = {
	id: string;
	club_id: string;
	name: string;
	description: string;
	status: SessionStatus;
	start_at: string;
	end_at: string;
	venue_name: string | null;
	latitude: number | null;
	longitude: number | null;
	max_players: number;
	min_players: number;
	court_count: number;
	court_fee_per_hour: number;
	shuttle_price_per_each: number;
	match_score_type: MatchScoreType;
	match_type: MatchType;
	cancellation_fee: number;
	max_buffer: number;
	promptpay_type: 'phone' | 'national_id' | null;
	promptpay_target: string | null;
};

export type SessionClubSummary = {
	id: string;
	name: string;
};

export type SessionHostProfile = {
	id: string;
	display_name: string;
	tag: string;
};

export type SessionShuttleSummary = {
	id: string;
	name: string;
	speed: 75 | 76;
	price: number;
	number_per_box: number;
};

export type SessionListItem = SessionPublic & {
	club: SessionClubSummary | null;
	waiting_count: number;
	queued_count: number;
	my_membership: SessionPlayerMembership | null;
};

export type SessionPlayerMembership = {
	id: string;
	status: SessionPlayerStatus;
	fee_owed: number;
	fee_status: CancellationFeeStatus;
	joined_at: string;
	activity: PlayerActivity;
	idle_since: string | null;
};

export type OutstandingFee = {
	player_id: string;
	session_id: string;
	session_name: string;
	club_name: string;
	fee_owed: number;
	fee_status: CancellationFeeStatus;
	promptpay_target: string | null;
};

export type SessionPlayerPublic = {
	id: string;
	user_id: string;
	status: SessionPlayerStatus;
	joined_at: string;
	activity: PlayerActivity;
	idle_since: string | null;
	profile: {
		display_name: string;
		tag: string;
		avatar_url: string | null;
	} | null;
	is_me: boolean;
};

export type SessionDetail = SessionPublic & {
	club: SessionClubSummary | null;
	host: SessionHostProfile | null;
	shuttle: SessionShuttleSummary | null;
	waiting_count: number;
	queued_count: number;
	confirmed_count: number;
	my_membership: SessionPlayerMembership | null;
	has_outstanding_fee: boolean;
	waiting_players: SessionPlayerPublic[];
	queued_players: SessionPlayerPublic[];
	confirmed_players: SessionPlayerPublic[];
};

export const matchTypeLabel = (matchType: MatchType): string =>
	matchType === 'one_round' ? 'One round' : 'Two rounds';

export const sessionStatusLabel = (status: SessionStatus): string => {
	switch (status) {
		case 'draft':
			return 'Draft';
		case 'open':
			return 'Open';
		case 'in_progress':
			return 'In progress';
		case 'closed':
			return 'Closed';
		case 'cancelled':
			return 'Cancelled';
	}
};

export const sessionStatusBadgeClass = (status: SessionStatus): string => {
	switch (status) {
		case 'draft':
			return 'bg-amber-50 text-amber-800';
		case 'open':
			return 'bg-emerald-50 text-emerald-700';
		case 'in_progress':
			return 'bg-sky-50 text-sky-700';
		case 'closed':
			return 'bg-slate-100 text-slate-700';
		case 'cancelled':
			return 'bg-red-50 text-red-700';
	}
};

export const sessionPlayerStatusLabel = (status: SessionPlayerStatus): string => {
	switch (status) {
		case 'waiting':
			return 'Waiting for confirmation';
		case 'queued':
			return 'In buffer queue';
		case 'confirmed':
			return 'Confirmed';
		case 'rejected':
			return 'Rejected';
		case 'cancelled':
			return 'Cancelled';
		case 'left':
			return 'Left';
	}
};

export const formatThb = (amount: number): string =>
	new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
