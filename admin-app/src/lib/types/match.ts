import type { MatchGameInput, MatchStatus, MatchTeam } from '@repo/ui/matches';

export type { MatchGameInput, MatchStatus, MatchTeam };

export type MatchPlayerProfile = {
	id: string;
	display_name: string | null;
	tag: string | null;
	avatar_url: string | null;
};

export type MatchPlayer = {
	id: string;
	match_id: string;
	session_id: string;
	user_id: string;
	team: MatchTeam;
	invite_status: 'pending' | 'accepted' | 'rejected';
	score_response: 'pending' | 'accepted' | 'rejected';
	responded_at: string | null;
	created_at: string;
	updated_at: string;
};

export type MatchPlayerWithProfile = MatchPlayer & {
	profile: MatchPlayerProfile | null;
};

export type MatchGame = {
	id: string;
	match_id: string;
	game_no: number;
	team_a_score: number;
	team_b_score: number;
	created_at: string;
};

export type Match = {
	id: string;
	session_id: string;
	court_number: number;
	status: MatchStatus;
	match_mode: 'manual' | 'auto';
	round_type: 'one_round' | 'two_round';
	score_type: 15 | 21;
	shuttles_used: number;
	invite_expires_at: string | null;
	score_submitted_by: string | null;
	created_by: string | null;
	started_at: string | null;
	ended_at: string | null;
	created_at: string;
	updated_at: string;
};

export type MatchWithDetails = Match & {
	players: MatchPlayerWithProfile[];
	games: MatchGame[];
};

export type CourtGridMatch = {
	matchId: string;
	courtNumber: number;
	status: MatchStatus;
	teamA: string[];
	teamB: string[];
	score?: string;
};
