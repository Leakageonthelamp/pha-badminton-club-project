export type SessionStatus = 'open' | 'in_progress' | 'closed' | 'cancelled';
export type MatchScoreType = 15 | 21;
export type MatchType = 'one_round' | 'two_round';

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
	joined_at: string;
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
};

export const matchTypeLabel = (matchType: MatchType): string =>
	matchType === 'one_round' ? 'One round' : 'Two rounds';

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
