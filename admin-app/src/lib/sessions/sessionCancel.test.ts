import '$lib/i18n';
import { describe, expect, it } from 'vitest';
import { sessionCancelDetail, sessionCancelSourceLabel } from './sessionCancel';

describe('sessionCancel helpers', () => {
	it('labels cancel sources', () => {
		expect(sessionCancelSourceLabel('club_admin')).toBe('Club admin');
		expect(sessionCancelSourceLabel('super_admin')).toBe('Super admin');
		expect(sessionCancelSourceLabel('system')).toBe('Automatic');
	});

	it('formats admin cancel detail with actor name', () => {
		expect(
			sessionCancelDetail({
				status: 'cancelled',
				cancel_source: 'club_admin',
				cancel_reason: 'Cancelled by club admin.',
				cancelled_by_name: 'Admin One'
			})
		).toBe('Club admin (Admin One) · Cancelled by club admin.');
	});

	it('formats auto cancel without actor name', () => {
		expect(
			sessionCancelDetail({
				status: 'cancelled',
				cancel_source: 'system',
				cancel_reason:
					'Not enough confirmed players at start time (minimum 4).',
				cancelled_by_name: null
			})
		).toBe(
			'Automatic · Not enough confirmed players at start time (minimum 4).'
		);
	});

	it('returns null for non-cancelled sessions', () => {
		expect(
			sessionCancelDetail({
				status: 'closed',
				cancel_source: null,
				cancel_reason: null
			})
		).toBeNull();
	});
});
