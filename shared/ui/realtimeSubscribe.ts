import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

export type PostgresChangeListen = {
	event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
	table: string;
	filter?: string;
};

export type PollFallbackOptions = {
	pollIntervalMs?: number;
	connectTimeoutMs?: number;
};

/** Realtime with poll fallback when WebSocket fails (e.g. Firefox + Cloudflare __cf_bm). */
export const subscribePostgresChangesWithPollFallback = (
	supabase: SupabaseClient,
	channelName: string,
	listeners: PostgresChangeListen[],
	onChange: () => void,
	options: PollFallbackOptions = {}
): (() => void) => {
	const pollIntervalMs = options.pollIntervalMs ?? 5_000;
	const connectTimeoutMs = options.connectTimeoutMs ?? 4_000;

	let disposed = false;
	let realtimeActive = false;
	let pollTimer: ReturnType<typeof setInterval> | undefined;
	let connectTimer: ReturnType<typeof setTimeout> | undefined;
	let channel: RealtimeChannel;

	const startPolling = () => {
		if (disposed || pollTimer || realtimeActive) return;
		pollTimer = setInterval(onChange, pollIntervalMs);
	};

	const stopPolling = () => {
		if (!pollTimer) return;
		clearInterval(pollTimer);
		pollTimer = undefined;
	};

	const clearConnectTimer = () => {
		if (!connectTimer) return;
		clearTimeout(connectTimer);
		connectTimer = undefined;
	};

	const scheduleConnectTimeout = () => {
		clearConnectTimer();
		connectTimer = setTimeout(() => {
			if (disposed || realtimeActive) return;
			startPolling();
		}, connectTimeoutMs);
	};

	const handleSubscribeStatus = (status: string) => {
		if (disposed) return;
		if (status === 'SUBSCRIBED') {
			realtimeActive = true;
			stopPolling();
			clearConnectTimer();
		} else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
			realtimeActive = false;
			startPolling();
		}
	};

	const connect = () => {
		let next = supabase.channel(channelName);
		for (const listener of listeners) {
			next = next.on(
				'postgres_changes',
				{
					event: listener.event ?? '*',
					schema: 'public',
					table: listener.table,
					...(listener.filter ? { filter: listener.filter } : {})
				},
				onChange
			);
		}
		next.subscribe(handleSubscribeStatus);
		channel = next;
		scheduleConnectTimeout();
	};

	// ponytail: backgrounded tabs kill WS without an error status — resync on visible/online rebuilds the channel
	const resync = () => {
		if (disposed) return;
		if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;

		realtimeActive = false;
		stopPolling();
		clearConnectTimer();
		void supabase.removeChannel(channel);
		connect();
		onChange();
	};

	connect();

	if (typeof document !== 'undefined') {
		document.addEventListener('visibilitychange', resync);
	}
	if (typeof globalThis.window !== 'undefined') {
		globalThis.window.addEventListener('online', resync);
	}

	return () => {
		disposed = true;
		clearConnectTimer();
		stopPolling();
		if (typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', resync);
		}
		if (typeof globalThis.window !== 'undefined') {
			globalThis.window.removeEventListener('online', resync);
		}
		void supabase.removeChannel(channel);
	};
};
