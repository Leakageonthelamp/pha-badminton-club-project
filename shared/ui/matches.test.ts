import { describe, expect, it } from 'vitest';
import {
	deriveGameWinner,
	deriveMatchWinner,
	formatMatchScore,
	splitTeams
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

	it('formatMatchScore sorts by game number', () => {
		expect(
			formatMatchScore([
				{ game_no: 2, team_a_score: 19, team_b_score: 21 },
				{ game_no: 1, team_a_score: 21, team_b_score: 18 }
			])
		).toBe('21-18, 19-21');
	});
});
