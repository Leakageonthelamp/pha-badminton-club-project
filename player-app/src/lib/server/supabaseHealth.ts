import type { App } from '$lib/types/app';

const UNAVAILABLE_HINTS = [
	'fetch failed',
	'failed to fetch',
	'network',
	'econnrefused',
	'enotfound',
	'timeout',
	'socket',
	'connection reset',
	'service unavailable',
	'bad gateway',
	'gateway timeout'
];

export const markServiceUnavailable = (locals: App.Locals): void => {
	locals.serviceUnavailable = true;
};

export const isSupabaseUnavailableError = (error: unknown): boolean => {
	if (error instanceof TypeError) {
		const msg = error.message.toLowerCase();
		if (UNAVAILABLE_HINTS.some((hint) => msg.includes(hint))) {
			return true;
		}
	}

	if (!error || typeof error !== 'object') {
		return false;
	}

	const record = error as { message?: string; status?: number; code?: string; name?: string };
	const message = (record.message ?? '').toLowerCase();
	const code = (record.code ?? '').toLowerCase();
	const name = (record.name ?? '').toLowerCase();

	if (record.status === 502 || record.status === 503 || record.status === 504) {
		return true;
	}

	if (name === 'authretryablefetcherror' || name === 'authapierror') {
		if (UNAVAILABLE_HINTS.some((hint) => message.includes(hint))) {
			return true;
		}
	}

	if (UNAVAILABLE_HINTS.some((hint) => message.includes(hint))) {
		return true;
	}

	// PostgREST / Supabase infra
	if (code === 'pgrst001' || code === 'pgrst002' || code === '57p03') {
		return true;
	}

	return false;
};
