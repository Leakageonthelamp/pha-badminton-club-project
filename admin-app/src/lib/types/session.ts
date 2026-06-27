export type SessionStatus = 'open' | 'in_progress' | 'closed' | 'cancelled';
export type MatchScoreType = 15 | 21;
export type MatchType = 'one_round' | 'two_round';

export type Session = {
	id: string;
	club_id: string;
	host_id: string;
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
	shuttle_id: string | null;
	shuttle_price_per_each: number;
	match_score_type: MatchScoreType;
	match_type: MatchType;
	created_at: string;
	updated_at: string;
};

export type SessionHostProfile = {
	id: string;
	display_name: string;
	tag: string;
};

export type SessionClubSummary = {
	id: string;
	name: string;
};

export type SessionShuttleSummary = {
	id: string;
	name: string;
	speed: 75 | 76;
	price: number;
	number_per_box: number;
};

export type SessionListItem = Session & {
	club: SessionClubSummary | null;
	host: SessionHostProfile | null;
};

export type SessionDetail = Session & {
	club: SessionClubSummary | null;
	host: SessionHostProfile | null;
	shuttle: SessionShuttleSummary | null;
};

export const sessionStatusLabel = (status: SessionStatus): string => {
	switch (status) {
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

export const matchTypeLabel = (matchType: MatchType): string =>
	matchType === 'one_round' ? 'One round' : 'Two rounds';

export const sessionStatusBadgeClass = (status: SessionStatus): string => {
	switch (status) {
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
