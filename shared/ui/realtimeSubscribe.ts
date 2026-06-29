import type { SupabaseClient } from '@supabase/supabase-js';

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

	const startPolling = () => {
		if (disposed || pollTimer || realtimeActive) return;
		pollTimer = setInterval(onChange, pollIntervalMs);
	};

	const stopPolling = () => {
		if (!pollTimer) return;
		clearInterval(pollTimer);
		pollTimer = undefined;
	};

	let channel = supabase.channel(channelName);
	for (const listener of listeners) {
		channel = channel.on(
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

	channel.subscribe((status) => {
		if (disposed) return;
		if (status === 'SUBSCRIBED') {
			realtimeActive = true;
			stopPolling();
		} else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
			realtimeActive = false;
			startPolling();
		}
	});

	const connectTimer = setTimeout(() => {
		if (disposed || realtimeActive) return;
		startPolling();
	}, connectTimeoutMs);

	return () => {
		disposed = true;
		clearTimeout(connectTimer);
		stopPolling();
		void supabase.removeChannel(channel);
	};
};
