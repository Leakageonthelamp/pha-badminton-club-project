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

export type MatchScoreType = 15 | 21;

export type MatchRoundType = 'one_round' | 'two_round';

export type MatchScoreResponse = 'pending' | 'accepted' | 'rejected';

export type MatchPlayerLike = {
	team: MatchTeam;
	displayName?: string | null;
};

export type MatchPlayerUserLike = {
	user_id: string;
	team: MatchTeam;
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

export const matchScoreResponseLabel = (
	response: MatchScoreResponse,
	isSubmitter = false
): string => {
	if (isSubmitter) return 'Submitted';
	switch (response) {
		case 'accepted':
			return 'Accepted';
		case 'rejected':
			return 'Rejected';
		default:
			return 'Waiting';
	}
};

export const matchScoreResponseBadgeClass = (
	response: MatchScoreResponse,
	isSubmitter = false
): string => {
	if (isSubmitter) return 'bg-brand-100 text-brand-800';
	switch (response) {
		case 'accepted':
			return 'bg-emerald-100 text-emerald-800';
		case 'rejected':
			return 'bg-rose-100 text-rose-800';
		default:
			return 'bg-amber-100 text-amber-800';
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

export const findPlayerTeam = (
	userId: string,
	players: MatchPlayerUserLike[]
): MatchTeam | null => players.find((player) => player.user_id === userId)?.team ?? null;

export const playerMatchResult = (
	userId: string,
	players: MatchPlayerUserLike[],
	games: MatchGameLike[]
): 'win' | 'lose' | null => {
	const team = findPlayerTeam(userId, players);
	const winner = deriveMatchWinner(games);
	if (!team || !winner) return null;
	return team === winner ? 'win' : 'lose';
};

export const formatMatchScoreForTeam = (games: MatchGameLike[], team: MatchTeam): string =>
	[...games]
		.sort((a, b) => a.game_no - b.game_no)
		.map((game) =>
			team === 'A'
				? `${game.team_a_score}-${game.team_b_score}`
				: `${game.team_b_score}-${game.team_a_score}`
		)
		.join(', ');

export const courtGridStatusLabel = (status?: MatchStatus | null): string =>
	status ? matchStatusLabel(status) : 'Idle';

export const isCourtClickable = (status?: MatchStatus | null): boolean => !status;

/** Rally-point game: win at target if opponent below deuce line, or win by 2 after deuce. */
export const rallyScoreHint = (scoreType: MatchScoreType): string => {
	const deuceLine = scoreType - 1;
	return `First to ${scoreType} wins if the other team is below ${deuceLine}. At ${deuceLine}-${deuceLine}, play continues until one team leads by 2 (e.g. ${scoreType + 1}-${deuceLine}).`;
};

export const validateRallyGameScore = (
	teamA: number,
	teamB: number,
	scoreType: MatchScoreType
): string | null => {
	if (!Number.isFinite(teamA) || !Number.isFinite(teamB)) {
		return 'Enter both scores';
	}

	if (teamA < 0 || teamB < 0) {
		return 'Scores cannot be negative';
	}

	if (teamA === teamB) {
		return 'Game cannot be tied';
	}

	const deuceLine = scoreType - 1;
	const winner = Math.max(teamA, teamB);
	const loser = Math.min(teamA, teamB);

	if (winner === scoreType && loser < deuceLine) {
		return null;
	}

	if (loser >= deuceLine && winner - loser === 2) {
		return null;
	}

	return `Invalid ${scoreType}-point game score`;
};

export const isValidRallyGameScore = (
	teamA: number,
	teamB: number,
	scoreType: MatchScoreType
): boolean => validateRallyGameScore(teamA, teamB, scoreType) === null;

export const validateMatchGames = (
	games: MatchGameLike[],
	roundType: MatchRoundType,
	scoreType: MatchScoreType
): string | null => {
	const expected = roundType === 'two_round' ? 2 : 1;

	if (games.length !== expected) {
		return `Enter ${expected} game score${expected === 1 ? '' : 's'}`;
	}

	for (const game of games) {
		const error = validateRallyGameScore(game.team_a_score, game.team_b_score, scoreType);
		if (error) {
			return `Game ${game.game_no}: ${error}`;
		}
	}

	return null;
};
