import { describe, expect, it, vi } from 'vitest';
import { subscribePostgresChangesWithPollFallback } from './realtimeSubscribe.js';

describe('subscribePostgresChangesWithPollFallback', () => {
	it('starts polling when subscribe times out', () => {
		vi.useFakeTimers();
		const onChange = vi.fn();
		const channel = {
			on: vi.fn().mockReturnThis(),
			subscribe: vi.fn()
		};
		const supabase = {
			channel: vi.fn(() => channel),
			removeChannel: vi.fn()
		};

		const cleanup = subscribePostgresChangesWithPollFallback(
			supabase as never,
			'test',
			[{ table: 'sessions', filter: 'id=eq.1' }],
			onChange,
			{ connectTimeoutMs: 100, pollIntervalMs: 200 }
		);

		vi.advanceTimersByTime(100);
		expect(onChange).not.toHaveBeenCalled();

		vi.advanceTimersByTime(200);
		expect(onChange).toHaveBeenCalledTimes(1);

		cleanup();
		vi.useRealTimers();
	});

	it('stops polling after realtime connects', () => {
		vi.useFakeTimers();
		const onChange = vi.fn();
		let subscribeCb: ((status: string) => void) | undefined;
		const channel = {
			on: vi.fn().mockReturnThis(),
			subscribe: vi.fn((cb: (status: string) => void) => {
				subscribeCb = cb;
			})
		};
		const supabase = {
			channel: vi.fn(() => channel),
			removeChannel: vi.fn()
		};

		const cleanup = subscribePostgresChangesWithPollFallback(
			supabase as never,
			'test',
			[{ table: 'sessions' }],
			onChange,
			{ connectTimeoutMs: 100, pollIntervalMs: 200 }
		);

		subscribeCb?.('SUBSCRIBED');
		vi.advanceTimersByTime(500);
		expect(onChange).not.toHaveBeenCalled();

		cleanup();
		vi.useRealTimers();
	});
});
