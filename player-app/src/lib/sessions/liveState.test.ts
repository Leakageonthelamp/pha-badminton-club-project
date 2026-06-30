import { describe, expect, it } from 'vitest';
import {
	canRequestEarlyLeave,
	deriveLiveSessionUiState,
	isLiveSessionEnded,
	shouldShowPaymentModal
} from './liveState';

describe('deriveLiveSessionUiState', () => {
	it('shows payment due when a pending payment exists', () => {
		expect(
			deriveLiveSessionUiState({
				membershipStatus: 'confirmed',
				leaveRequestStatus: 'pending',
				paymentStatus: 'pending',
				sessionClosed: false
			})
		).toBe('payment_due');
	});

	it('waits for leave approval after payment is approved', () => {
		expect(
			deriveLiveSessionUiState({
				membershipStatus: 'confirmed',
				leaveRequestStatus: 'pending',
				paymentStatus: 'approved',
				sessionClosed: false
			})
		).toBe('awaiting_leave');
	});

	it('shows summary after leave is approved', () => {
		expect(
			deriveLiveSessionUiState({
				membershipStatus: 'left',
				leaveRequestStatus: 'approved',
				paymentStatus: 'approved',
				sessionClosed: false
			})
		).toBe('summary');
	});
});

describe('shouldShowPaymentModal', () => {
	it('stays open while payment is due or submitted', () => {
		expect(shouldShowPaymentModal('payment_due', 'pending')).toBe(true);
		expect(shouldShowPaymentModal('payment_submitted', 'submitted')).toBe(true);
	});

	it('closes once payment is approved, including while awaiting leave', () => {
		expect(shouldShowPaymentModal('awaiting_leave', 'approved')).toBe(false);
		expect(shouldShowPaymentModal('payment_submitted', 'approved')).toBe(false);
		expect(shouldShowPaymentModal('active', 'approved')).toBe(false);
	});

	it('closes when the session ends or the player has left', () => {
		expect(shouldShowPaymentModal('summary', 'pending', true)).toBe(false);
		expect(shouldShowPaymentModal('payment_due', 'pending', true)).toBe(false);
		expect(shouldShowPaymentModal('payment_submitted', 'submitted', true)).toBe(false);
	});
});

describe('isLiveSessionEnded', () => {
	const endAtMs = Date.parse('2026-06-01T02:00:00.000Z');

	it('is false before scheduled end', () => {
		expect(
			isLiveSessionEnded({
				status: 'in_progress',
				endAtMs,
				nowMs: endAtMs - 1
			})
		).toBe(false);
	});

	it('is true at or after scheduled end', () => {
		expect(
			isLiveSessionEnded({
				status: 'in_progress',
				endAtMs,
				nowMs: endAtMs
			})
		).toBe(true);
	});

	it('is true when settlement started or ended early', () => {
		expect(
			isLiveSessionEnded({
				status: 'in_progress',
				endAtMs,
				nowMs: endAtMs - 60_000,
				settlementStarted: true
			})
		).toBe(true);
		expect(
			isLiveSessionEnded({
				status: 'in_progress',
				endAtMs,
				nowMs: endAtMs - 60_000,
				endedEarly: true
			})
		).toBe(true);
	});
});

describe('canRequestEarlyLeave', () => {
	it('allows confirmed players without a pending leave request', () => {
		expect(
			canRequestEarlyLeave(
				{
					id: 'm1',
					status: 'confirmed',
					fee_owed: 0,
					fee_status: 'none',
					joined_at: '2026-06-01T00:00:00.000Z',
					left_at: null,
					activity: 'idle',
					idle_since: '2026-06-01T00:00:00.000Z'
				},
				null
			)
		).toBe(true);
	});

	it('blocks when a leave request is pending', () => {
		expect(
			canRequestEarlyLeave(
				{
					id: 'm1',
					status: 'confirmed',
					fee_owed: 0,
					fee_status: 'none',
					joined_at: '2026-06-01T00:00:00.000Z',
					left_at: null,
					activity: 'idle',
					idle_since: '2026-06-01T00:00:00.000Z'
				},
				'pending'
			)
		).toBe(false);
	});

	it('blocks when the session has ended', () => {
		expect(
			canRequestEarlyLeave(
				{
					id: 'm1',
					status: 'confirmed',
					fee_owed: 0,
					fee_status: 'none',
					joined_at: '2026-06-01T00:00:00.000Z',
					left_at: null,
					activity: 'idle',
					idle_since: '2026-06-01T00:00:00.000Z'
				},
				null,
				true
			)
		).toBe(false);
	});
});
