import {
	computeMatchSummary,
	extractHistorySessions,
	filterSortPaginateMatchHistory,
	parseHistorySession
} from '$lib/matches/history';
import type {
	CourtGridMatch,
	MatchGameInput,
	MatchHistoryItem,
	MatchHistoryPage,
	MatchResultFilter,
	MatchWithDetails
} from '$lib/types/match';
import { ensureSupabaseAuth } from '$lib/server/supabaseAuth';
import { formatMatchScore, playerMatchResult, splitTeams } from '@repo/ui/matches';
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

const attachMatchDetails = async (
	supabase: SupabaseClient,
	matches: Omit<MatchWithDetails, 'players' | 'games'>[]
): Promise<MatchWithDetails[]> => {
	if (!matches.length) return [];

	const matchIds = matches.map((match) => match.id);

	const [{ data: players }, { data: games }] = await Promise.all([
		supabase.from('match_players').select(matchPlayerSelect).in('match_id', matchIds),
		supabase
			.from('match_games')
			.select('id, match_id, game_no, team_a_score, team_b_score, created_at')
			.in('match_id', matchIds)
			.order('game_no', { ascending: true })
	]);

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

export const loadSessionMatches = async (
	supabase: SupabaseClient,
	sessionId: string
): Promise<MatchWithDetails[]> => {
	const { data: matches, error } = await supabase
		.from('matches')
		.select(matchSelect)
		.eq('session_id', sessionId)
		.order('created_at', { ascending: true });

	if (error) {
		console.error('Failed to load session matches', error);
		return [];
	}

	return attachMatchDetails(supabase, matches ?? []);
};

export const loadMatchForPlayer = async (
	supabase: SupabaseClient,
	matchId: string,
	userId: string
): Promise<MatchWithDetails | null> => {
	const { data: match, error } = await supabase
		.from('matches')
		.select(matchSelect)
		.eq('id', matchId)
		.maybeSingle();

	if (error || !match) {
		if (error) console.error('Failed to load match', error);
		return null;
	}

	const [detailed] = await attachMatchDetails(supabase, [match]);
	if (!detailed.players.some((player) => player.user_id === userId)) {
		return null;
	}

	return detailed;
};

export const loadMyInviteMatch = async (
	supabase: SupabaseClient,
	sessionId: string,
	userId: string
): Promise<MatchWithDetails | null> => {
	const { data, error } = await supabase
		.from('match_players')
		.select('match_id')
		.eq('session_id', sessionId)
		.eq('user_id', userId)
		.in('invite_status', ['pending', 'accepted']);

	if (error || !data?.length) {
		return null;
	}

	for (const row of data) {
		const match = await loadMatchForPlayer(supabase, row.match_id, userId);
		if (match?.status !== 'pending') continue;

		if (
			match.invite_expires_at &&
			new Date(match.invite_expires_at).getTime() <= Date.now()
		) {
			continue;
		}

		return match;
	}

	return null;
};

/** @deprecated use loadMyInviteMatch */
export const loadMyPendingInvite = loadMyInviteMatch;

export const loadMyOpenMatch = async (
	supabase: SupabaseClient,
	sessionId: string,
	userId: string
): Promise<MatchWithDetails | null> => {
	const { data, error } = await supabase
		.from('match_players')
		.select('match_id')
		.eq('session_id', sessionId)
		.eq('user_id', userId);

	if (error || !data?.length) {
		return null;
	}

	for (const row of data) {
		const match = await loadMatchForPlayer(supabase, row.match_id, userId);
		if (
			match &&
			['active', 'score_pending', 'suspended'].includes(match.status)
		) {
			return match;
		}
	}

	return null;
};

export const loadMyMatchHistory = async (
	supabase: SupabaseClient,
	sessionId: string,
	userId: string
): Promise<MatchWithDetails[]> => {
	const matches = await loadSessionMatches(supabase, sessionId);
	return matches.filter(
		(match) =>
			match.status === 'completed' &&
			match.players.some((player) => player.user_id === userId)
	);
};

const emptyMatchHistoryPage = (
	options: {
		page: number;
		resultFilter: MatchResultFilter;
		sessionFilter: string;
		date: string;
	}
): MatchHistoryPage =>
	filterSortPaginateMatchHistory([], {
		resultFilter: options.resultFilter,
		sessionFilter: options.sessionFilter,
		page: options.page,
		date: options.date,
		summary: computeMatchSummary([])
	});

export const loadMatchHistoryForPlayer = async (
	supabase: SupabaseClient,
	userId: string,
	options: {
		page?: number;
		resultFilter?: MatchResultFilter;
		sessionFilter?: string;
		date?: string;
	}
): Promise<MatchHistoryPage> => {
	const page = Math.max(1, options.page ?? 1);
	const resultFilter = options.resultFilter ?? '';
	const date = options.date ?? '';

	await ensureSupabaseAuth(supabase);

	const { data: playerRows, error: playerError } = await supabase
		.from('match_players')
		.select('match_id')
		.eq('user_id', userId);

	if (playerError || !playerRows?.length) {
		return emptyMatchHistoryPage({ page, resultFilter, sessionFilter: '', date });
	}

	const matchIds = [...new Set(playerRows.map((row) => row.match_id))];

	const { data: matches, error } = await supabase
		.from('matches')
		.select(
			`
			${matchSelect},
			session:sessions (
				id,
				name,
				start_at,
				club:clubs ( id, name )
			)
		`
		)
		.in('id', matchIds)
		.eq('status', 'completed')
		.order('ended_at', { ascending: false });

	if (error) {
		console.error('Failed to load match history', error);
		return emptyMatchHistoryPage({ page, resultFilter, sessionFilter: '', date });
	}

	type SessionJoin = {
		id: string;
		name: string;
		start_at: string;
		club: { id: string; name: string } | { id: string; name: string }[] | null;
	};

	const sessionByMatchId = new Map<
		string,
		{ session: SessionJoin; club: { id: string; name: string } | null }
	>();
	const baseMatches: Omit<MatchWithDetails, 'players' | 'games'>[] = [];

	for (const row of matches ?? []) {
		const session = normalizeRelation(
			row.session as SessionJoin | SessionJoin[] | null | undefined
		);
		if (!session) continue;

		const club = normalizeRelation(session.club);
		sessionByMatchId.set(row.id, { session, club });
		const { session: _session, ...matchRow } = row as typeof row & { session?: unknown };
		baseMatches.push(matchRow as Omit<MatchWithDetails, 'players' | 'games'>);
	}

	const detailed = await attachMatchDetails(supabase, baseMatches);

	const items: MatchHistoryItem[] = detailed.map((match) => {
		const joined = sessionByMatchId.get(match.id);
		const session = joined?.session;
		const club = joined?.club;
		const startedMs = match.started_at ? new Date(match.started_at).getTime() : Number.NaN;
		const endedMs = match.ended_at ? new Date(match.ended_at).getTime() : Number.NaN;
		const durationMs =
			!Number.isNaN(startedMs) && !Number.isNaN(endedMs) && endedMs >= startedMs
				? endedMs - startedMs
				: null;

		return {
			...match,
			session_name: session?.name ?? 'Session',
			session_start_at: session?.start_at ?? match.created_at,
			club_id: club?.id ?? '',
			club_name: club?.name ?? 'Club session',
			result: playerMatchResult(userId, match.players, match.games),
			score: formatMatchScore(match.games),
			durationMs
		};
	});

	const summary = computeMatchSummary(items);
	const sessions = extractHistorySessions(items);
	const sessionFilter = parseHistorySession(
		options.sessionFilter ?? '',
		new Set(sessions.map((session) => session.id))
	);

	return filterSortPaginateMatchHistory(items, {
		resultFilter,
		sessionFilter,
		page,
		date,
		sessions,
		summary
	});
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

export const respondMatchInvite = async (
	supabase: SupabaseClient,
	matchId: string,
	accept: boolean
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('respond_match_invite', {
		p_match_id: matchId,
		p_accept: accept
	});

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};

export const submitMatchScore = async (
	supabase: SupabaseClient,
	matchId: string,
	games: MatchGameInput[]
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('submit_match_score', {
		p_match_id: matchId,
		p_games: games
	});

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};

export const respondMatchScore = async (
	supabase: SupabaseClient,
	matchId: string,
	accept: boolean
): Promise<{ ok: true } | { ok: false; message: string }> => {
	const { error } = await supabase.rpc('respond_match_score', {
		p_match_id: matchId,
		p_accept: accept
	});

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true };
};
