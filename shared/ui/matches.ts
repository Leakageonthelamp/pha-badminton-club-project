export type MatchStatus =
	| 'pending'
	| 'active'
	| 'score_pending'
	| 'suspended'
	| 'completed'
	| 'cancelled';

export type MatchTeam = 'A' | 'B';

export type MatchGameInput = {
	game_no: number;
	team_a_score: number;
	team_b_score: number;
};

export type MatchPlayerLike = {
	team: MatchTeam;
	displayName?: string | null;
};

export type MatchGameLike = {
	game_no: number;
	team_a_score: number;
	team_b_score: number;
};

export const matchStatusLabel = (status: MatchStatus): string => {
	switch (status) {
		case 'pending':
			return 'Inviting';
		case 'active':
			return 'Playing';
		case 'score_pending':
			return 'Confirming score';
		case 'suspended':
			return 'Suspended';
		case 'completed':
			return 'Completed';
		case 'cancelled':
			return 'Cancelled';
		default:
			return status;
	}
};

export const matchStatusBadgeClass = (status: MatchStatus): string => {
	switch (status) {
		case 'pending':
			return 'bg-amber-100 text-amber-800';
		case 'active':
			return 'bg-emerald-100 text-emerald-800';
		case 'score_pending':
			return 'bg-sky-100 text-sky-800';
		case 'suspended':
			return 'bg-rose-100 text-rose-800';
		case 'completed':
			return 'bg-slate-100 text-slate-700';
		case 'cancelled':
			return 'bg-slate-100 text-slate-500';
		default:
			return 'bg-slate-100 text-slate-600';
	}
};

export const splitTeams = <T extends MatchPlayerLike>(players: T[]): { teamA: T[]; teamB: T[] } => ({
	teamA: players.filter((player) => player.team === 'A'),
	teamB: players.filter((player) => player.team === 'B')
});

export const deriveGameWinner = (game: MatchGameLike): MatchTeam | null => {
	if (game.team_a_score === game.team_b_score) return null;
	return game.team_a_score > game.team_b_score ? 'A' : 'B';
};

export const deriveMatchWinner = (games: MatchGameLike[]): MatchTeam | null => {
	let winsA = 0;
	let winsB = 0;

	for (const game of games) {
		const winner = deriveGameWinner(game);
		if (winner === 'A') winsA += 1;
		if (winner === 'B') winsB += 1;
	}

	if (winsA === winsB) return null;
	return winsA > winsB ? 'A' : 'B';
};

export const formatMatchScore = (games: MatchGameLike[]): string =>
	games
		.sort((a, b) => a.game_no - b.game_no)
		.map((game) => `${game.team_a_score}-${game.team_b_score}`)
		.join(', ');

export const formatTeamRoster = (players: MatchPlayerLike[]): string =>
	players.map((player) => player.displayName ?? 'Player').join(' · ');

export const courtGridStatusLabel = (status?: MatchStatus | null): string =>
	status ? matchStatusLabel(status) : 'Idle';

export const isCourtClickable = (status?: MatchStatus | null): boolean => !status;
