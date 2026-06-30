import { describe, expect, it } from 'vitest';
import {
	deriveGameWinner,
	deriveMatchWinner,
	findPlayerTeam,
	formatMatchScore,
	formatMatchScoreForTeam,
	isMatchDraw,
	isValidRallyGameScore,
	matchScoreResponseLabel,
	playerMatchResult,
	splitTeams,
	validateMatchGames,
	validateRallyGameScore
} from './matches.js';

describe('matches helpers', () => {
	it('splitTeams groups A and B', () => {
		const teamPlayers = [
			{ team: 'A' as const, displayName: 'Alice' },
			{ team: 'A' as const, displayName: 'Amy' },
			{ team: 'B' as const, displayName: 'Bob' },
			{ team: 'B' as const, displayName: 'Ben' }
		];

		const { teamA, teamB } = splitTeams(teamPlayers);
		expect(teamA).toHaveLength(2);
		expect(teamB).toHaveLength(2);
		expect(teamA[0]?.displayName).toBe('Alice');
	});

	it('deriveGameWinner picks higher score', () => {
		expect(deriveGameWinner({ game_no: 1, team_a_score: 21, team_b_score: 18 })).toBe('A');
		expect(deriveGameWinner({ game_no: 1, team_a_score: 15, team_b_score: 21 })).toBe('B');
	});

	it('deriveMatchWinner handles split series', () => {
		expect(
			deriveMatchWinner([
				{ game_no: 1, team_a_score: 21, team_b_score: 18 },
				{ game_no: 2, team_a_score: 19, team_b_score: 21 }
			])
		).toBeNull();

		expect(
			deriveMatchWinner([
				{ game_no: 1, team_a_score: 21, team_b_score: 18 },
				{ game_no: 2, team_a_score: 21, team_b_score: 15 }
			])
		).toBe('A');
	});

	it('isMatchDraw detects 1-1 two-round split', () => {
		const splitGames = [
			{ game_no: 1, team_a_score: 21, team_b_score: 18 },
			{ game_no: 2, team_a_score: 19, team_b_score: 21 }
		];

		expect(isMatchDraw(splitGames)).toBe(true);
		expect(isMatchDraw([{ game_no: 1, team_a_score: 21, team_b_score: 18 }])).toBe(false);
		expect(
			isMatchDraw([
				{ game_no: 1, team_a_score: 21, team_b_score: 18 },
				{ game_no: 2, team_a_score: 21, team_b_score: 15 }
			])
		).toBe(false);
		expect(isMatchDraw([])).toBe(false);
	});

	it('formatMatchScore sorts by game number', () => {
		expect(
			formatMatchScore([
				{ game_no: 2, team_a_score: 19, team_b_score: 21 },
				{ game_no: 1, team_a_score: 21, team_b_score: 18 }
			])
		).toBe('21-18, 19-21');
	});

	it('findPlayerTeam and playerMatchResult resolve per-player outcomes', () => {
		const players = [
			{ user_id: 'u1', team: 'A' as const },
			{ user_id: 'u2', team: 'B' as const }
		];
		const games = [{ game_no: 1, team_a_score: 21, team_b_score: 15 }];

		expect(findPlayerTeam('u1', players)).toBe('A');
		expect(playerMatchResult('u1', players, games)).toBe('win');
		expect(playerMatchResult('u2', players, games)).toBe('lose');
		expect(formatMatchScoreForTeam(games, 'B')).toBe('15-21');
	});

	it('playerMatchResult returns draw for 1-1 split', () => {
		const players = [
			{ user_id: 'u1', team: 'A' as const },
			{ user_id: 'u2', team: 'B' as const }
		];
		const splitGames = [
			{ game_no: 1, team_a_score: 21, team_b_score: 18 },
			{ game_no: 2, team_a_score: 19, team_b_score: 21 }
		];

		expect(playerMatchResult('u1', players, splitGames)).toBe('draw');
		expect(playerMatchResult('u2', players, splitGames)).toBe('draw');
	});

	it('validateRallyGameScore accepts normal and deuce wins', () => {
		expect(validateRallyGameScore(21, 18, 21)).toBeNull();
		expect(validateRallyGameScore(10, 21, 21)).toBeNull();
		expect(validateRallyGameScore(22, 20, 21)).toBeNull();
		expect(validateRallyGameScore(23, 25, 21)).toBeNull();
		expect(validateRallyGameScore(15, 12, 15)).toBeNull();
		expect(validateRallyGameScore(16, 14, 15)).toBeNull();
	});

	it('validateRallyGameScore rejects invalid scores', () => {
		expect(validateRallyGameScore(21, 20, 21)).not.toBeNull();
		expect(validateRallyGameScore(22, 21, 21)).not.toBeNull();
		expect(validateRallyGameScore(19, 17, 21)).not.toBeNull();
		expect(validateRallyGameScore(21, 21, 21)).not.toBeNull();
	});

	it('validateMatchGames checks each game in a series', () => {
		expect(
			validateMatchGames(
				[
					{ game_no: 1, team_a_score: 21, team_b_score: 18 },
					{ game_no: 2, team_a_score: 19, team_b_score: 21 }
				],
				'two_round',
				21
			)
		).toBeNull();

		expect(
			validateMatchGames([{ game_no: 1, team_a_score: 21, team_b_score: 20 }], 'one_round', 21)
		).toContain('Game 1');
	});

	it('isValidRallyGameScore mirrors validateRallyGameScore', () => {
		expect(isValidRallyGameScore(21, 18, 21)).toBe(true);
		expect(isValidRallyGameScore(21, 20, 21)).toBe(false);
	});

	it('matchScoreResponseLabel distinguishes submitter and responses', () => {
		expect(matchScoreResponseLabel('pending', true)).toBe('Submitted');
		expect(matchScoreResponseLabel('accepted', false)).toBe('Accepted');
		expect(matchScoreResponseLabel('rejected', false)).toBe('Rejected');
		expect(matchScoreResponseLabel('pending', false)).toBe('Waiting');
	});
});
