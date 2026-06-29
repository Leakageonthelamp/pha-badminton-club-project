import type {
	CourtGridMatch,
	MatchGameInput,
	MatchWithDetails
} from '$lib/types/match';
import { formatMatchScore, splitTeams } from '@repo/ui/matches';
import type { SupabaseClient } from '@supabase/supabase-js';

const normalizeRelation = <T>(value: T | T[] | null | undefined): T | null => {
	if (Array.isArray(value)) {
		return value[0] ?? null;
	}

	return value ?? null;
};

const matchPlayerSelect = `
	id,
	match_id,
	session_id,
	user_id,
	team,
	invite_status,
	score_response,
	responded_at,
	created_at,
	updated_at,
	profile:profiles!match_players_user_id_fkey ( id, display_name, tag, avatar_url )
`;

const matchSelect = `
	id,
	session_id,
	court_number,
	status,
	match_mode,
	round_type,
	score_type,
	shuttles_used,
	invite_expires_at,
	score_submitted_by,
	created_by,
	started_at,
	ended_at,
	created_at,
	updated_at
`;

export const expirePendingMatches = async (
	supabase: SupabaseClient,
	sessionId?: string
): Promise<void> => {
	const { error } = await supabase.rpc('expire_pending_matches', {
		p_session_id: sessionId ?? null
	});

	if (error) {
		console.error('Failed to expire pending matches', error);
	}
};

export const loadSessionMatches = async (
	supabase: SupabaseClient,
	sessionId: string
): Promise<MatchWithDetails[]> => {
	const { data: matches, error: matchError } = await supabase
		.from('matches')
		.select(matchSelect)
		.eq('session_id', sessionId)
		.order('created_at', { ascending: true });

	if (matchError) {
		console.error('Failed to load session matches', matchError);
		return [];
	}

	if (!matches?.length) {
		return [];
	}

	const matchIds = matches.map((match) => match.id);

	const [{ data: players, error: playerError }, { data: games, error: gameError }] =
		await Promise.all([
			supabase.from('match_players').select(matchPlayerSelect).in('match_id', matchIds),
			supabase
				.from('match_games')
				.select('id, match_id, game_no, team_a_score, team_b_score, created_at')
				.in('match_id', matchIds)
				.order('game_no', { ascending: true })
		]);

	if (playerError) {
		console.error('Failed to load match players', playerError);
	}

	if (gameError) {
		console.error('Failed to load match games', gameError);
	}

	return matches.map((match) => ({
		...match,
		score_type: Number(match.score_type) as 15 | 21,
		players: (players ?? [])
			.filter((player) => player.match_id === match.id)
			.map((player) => ({
				...(player as Omit<MatchWithDetails['players'][number], 'profile'>),
				profile: normalizeRelation(
					player.profile as MatchWithDetails['players'][number]['profile'] | MatchWithDetails['players'][number]['profile'][]
				)
			})),
		games: (games ?? [])
			.filter((game) => game.match_id === match.id)
			.map((game) => ({
				...game,
				game_no: Number(game.game_no),
				team_a_score: Number(game.team_a_score),
				team_b_score: Number(game.team_b_score)
			}))
	}));
};

export const loadMatchDetail = async (
	supabase: SupabaseClient,
	matchId: string
): Promise<MatchWithDetails | null> => {
	const { data: match, error } = await supabase
		.from('matches')
		.select(matchSelect)
		.eq('id', matchId)
		.maybeSingle();

	if (error || !match) {
		if (error) console.error('Failed to load match detail', error);
		return null;
	}

	const [players, games] = await Promise.all([
		supabase.from('match_players').select(matchPlayerSelect).eq('match_id', matchId),
		supabase
			.from('match_games')
			.select('id, match_id, game_no, team_a_score, team_b_score, created_at')
			.eq('match_id', matchId)
			.order('game_no', { ascending: true })
	]);

	if (players.error) {
		console.error('Failed to load match players', players.error);
	}

	if (games.error) {
		console.error('Failed to load match games', games.error);
	}

	return {
		...match,
		score_type: Number(match.score_type) as 15 | 21,
		players: (players.data ?? []).map((player) => ({
			...(player as Omit<MatchWithDetails['players'][number], 'profile'>),
			profile: normalizeRelation(
				player.profile as MatchWithDetails['players'][number]['profile'] | MatchWithDetails['players'][number]['profile'][]
			)
		})),
		games: (games.data ?? []).map((game) => ({
			...game,
			game_no: Number(game.game_no),
			team_a_score: Number(game.team_a_score),
			team_b_score: Number(game.team_b_score)
		}))
	};
};

export const toCourtGridMatches = (matches: MatchWithDetails[]): CourtGridMatch[] =>
	matches
		.filter(
			(match) =>
				match.status === 'pending' ||
				match.status === 'active' ||
				match.status === 'score_pending' ||
				match.status === 'suspended'
		)
		.map((match) => {
			const { teamA, teamB } = splitTeams(
				match.players.map((player) => ({
					team: player.team,
					displayName: player.profile?.display_name ?? player.profile?.tag ?? 'Player'
				}))
			);

			return {
				matchId: match.id,
				courtNumber: match.court_number,
				status: match.status,
				teamA: teamA.map((player) => player.displayName ?? 'Player'),
				teamB: teamB.map((player) => player.displayName ?? 'Player'),
				score: match.games.length ? formatMatchScore(match.games) : undefined
			};
		});

export const createMatch = async (
	supabase: SupabaseClient,
	sessionId: string,
	courtNumber: number,
	userIds: string[]
): Promise<{ ok: true; matchId: string } | { ok: false; message: string }> => {
	const { data, error } = await supabase.rpc('create_match', {
		p_session_id: sessionId,
		p_court_number: courtNumber,
		p_user_ids: userIds
	});

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true, matchId: data.id as string };
};

export const addMatchShuttle = async (
	supabase: SupabaseClient,
	matchId: string
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('add_match_shuttle', { p_match_id: matchId });

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};

export const endMatchNoScore = async (
	supabase: SupabaseClient,
	matchId: string
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('end_match_no_score', { p_match_id: matchId });

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};

export const endMatchWithScore = async (
	supabase: SupabaseClient,
	matchId: string,
	games: MatchGameInput[]
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('end_match_with_score', {
		p_match_id: matchId,
		p_games: games
	});

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};

export const resolveMatchScore = async (
	supabase: SupabaseClient,
	matchId: string,
	games: MatchGameInput[]
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('resolve_match_score', {
		p_match_id: matchId,
		p_games: games
	});

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};
