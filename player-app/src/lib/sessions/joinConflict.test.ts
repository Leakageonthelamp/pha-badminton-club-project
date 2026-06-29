import { describe, expect, it } from 'vitest';
import {
	pickJoinConflict,
	sessionStartsTooSoonAfterLive,
	sessionsTimeOverlap
} from './joinConflict';

describe('sessionsTimeOverlap', () => {
	it('detects overlapping intervals', () => {
		expect(
			sessionsTimeOverlap(
				'2026-06-29T10:00:00.000Z',
				'2026-06-29T12:00:00.000Z',
				'2026-06-29T11:00:00.000Z',
				'2026-06-29T13:00:00.000Z'
			)
		).toBe(true);
	});

	it('returns false for adjacent non-overlapping intervals', () => {
		expect(
			sessionsTimeOverlap(
				'2026-06-29T10:00:00.000Z',
				'2026-06-29T12:00:00.000Z',
				'2026-06-29T12:00:00.000Z',
				'2026-06-29T14:00:00.000Z'
			)
		).toBe(false);
	});
});

describe('sessionStartsTooSoonAfterLive', () => {
	it('requires 2 hours after live session end', () => {
		expect(
			sessionStartsTooSoonAfterLive('2026-06-29T15:00:00.000Z', '2026-06-29T14:00:00.000Z')
		).toBe(true);
		expect(
			sessionStartsTooSoonAfterLive('2026-06-29T16:00:00.000Z', '2026-06-29T14:00:00.000Z')
		).toBe(false);
	});
});

describe('pickJoinConflict', () => {
	const target = {
		id: 'target',
		start_at: '2026-06-29T18:00:00.000Z',
		end_at: '2026-06-29T20:00:00.000Z'
	};

	it('blocks overlapping waiting membership', () => {
		const conflict = pickJoinConflict(target, [
			{
				status: 'waiting',
				session: {
					id: 'overlap',
					name: 'Friday night',
					start_at: '2026-06-29T17:00:00.000Z',
					end_at: '2026-06-29T19:00:00.000Z',
					status: 'open'
				}
			}
		]);

		expect(conflict?.kind).toBe('overlapping');
		expect(conflict?.session_name).toBe('Friday night');
	});

	it('allows live session player to join non-overlapping session 2+ hours after end', () => {
		const conflict = pickJoinConflict(
			{
				id: 'target',
				start_at: '2026-06-29T16:00:00.000Z',
				end_at: '2026-06-29T18:00:00.000Z'
			},
			[
				{
					status: 'confirmed',
					session: {
						id: 'live',
						name: 'Live session',
						start_at: '2026-06-29T10:00:00.000Z',
						end_at: '2026-06-29T14:00:00.000Z',
						status: 'in_progress'
					}
				}
			]
		);

		expect(conflict).toBeNull();
	});

	it('blocks live session player when next session starts within 2 hours of current end', () => {
		const conflict = pickJoinConflict(
			{
				id: 'target',
				start_at: '2026-06-29T15:00:00.000Z',
				end_at: '2026-06-29T17:00:00.000Z'
			},
			[
				{
					status: 'confirmed',
					session: {
						id: 'live',
						name: 'Live session',
						start_at: '2026-06-29T10:00:00.000Z',
						end_at: '2026-06-29T14:00:00.000Z',
						status: 'in_progress'
					}
				}
			]
		);

		expect(conflict?.kind).toBe('too_soon_after_live');
		expect(conflict?.session_id).toBe('live');
	});
});
