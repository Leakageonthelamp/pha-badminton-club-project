import type {
	MatchHistoryItem,
	MatchHistoryPage,
	MatchHistorySessionOption,
	MatchHistorySummary,
	MatchResultFilter
} from '$lib/types/match';
import { occurredOnDate } from '@repo/ui/transactions';

export const MATCH_HISTORY_PAGE_SIZE = 10;

export const resultFilterOptions: { value: MatchResultFilter; label: string }[] = [
	{ value: '', label: 'All results' },
	{ value: 'win', label: 'Wins' },
	{ value: 'lose', label: 'Losses' },
	{ value: 'draw', label: 'Draws' }
];

export const extractHistorySessions = (
	items: MatchHistoryItem[]
): MatchHistorySessionOption[] => {
	const map = new Map<string, string>();
	for (const item of items) {
		map.set(item.session_id, item.session_name);
	}
	return [...map.entries()]
		.map(([id, name]) => ({ id, name }))
		.sort((a, b) => a.name.localeCompare(b.name));
};

export const sessionFilterOptions = (
	sessions: MatchHistorySessionOption[]
): { value: string; label: string }[] => [
	{ value: '', label: 'All sessions' },
	...sessions.map((session) => ({ value: session.id, label: session.name }))
];

export const parseHistoryPage = (value: string | null): number =>
	Math.max(1, Number(value ?? '1') || 1);

export const parseHistoryDate = (value: string | null): string => {
	if (!value) return '';
	return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
};

export const parseResultFilter = (value: string | null): MatchResultFilter => {
	const allowed = new Set(resultFilterOptions.map((option) => option.value));
	return allowed.has(value as MatchResultFilter) ? (value as MatchResultFilter) : '';
};

export const parseHistorySession = (value: string | null, allowedIds: Set<string>): string => {
	if (!value || !allowedIds.has(value)) return '';
	return value;
};

export const computeMatchSummary = (items: MatchHistoryItem[]): MatchHistorySummary => {
	let wins = 0;
	let losses = 0;
	let draws = 0;
	let durationTotal = 0;
	let durationCount = 0;
	let totalShuttles = 0;

	for (const item of items) {
		if (item.result === 'win') wins += 1;
		else if (item.result === 'lose') losses += 1;
		else if (item.result === 'draw') draws += 1;

		if (item.durationMs !== null && item.durationMs >= 0) {
			durationTotal += item.durationMs;
			durationCount += 1;
		}

		totalShuttles += item.shuttles_used;
	}

	const decided = wins + losses;

	return {
		totalMatches: items.length,
		wins,
		losses,
		draws,
		winRate: decided > 0 ? Math.round((wins / decided) * 100) : null,
		avgDurationMs: durationCount > 0 ? Math.round(durationTotal / durationCount) : null,
		totalShuttles
	};
};

export const filterSortPaginateMatchHistory = (
	items: MatchHistoryItem[],
	options: {
		resultFilter: MatchResultFilter;
		sessionFilter?: string;
		page: number;
		date?: string;
		sessions?: MatchHistorySessionOption[];
		summary: MatchHistorySummary;
	}
): MatchHistoryPage => {
	const page = Math.max(1, options.page);
	const resultFilter = options.resultFilter;
	const sessionFilter = options.sessionFilter ?? '';
	const date = options.date ?? '';
	const sessions = options.sessions ?? extractHistorySessions(items);

	const sorted = [...items].sort((a, b) => {
		const aMs = a.ended_at ? new Date(a.ended_at).getTime() : 0;
		const bMs = b.ended_at ? new Date(b.ended_at).getTime() : 0;
		return bMs - aMs;
	});

	const filtered = sorted.filter((item) => {
		if (resultFilter && item.result !== resultFilter) return false;
		if (sessionFilter && item.session_id !== sessionFilter) return false;
		if (date && item.ended_at && !occurredOnDate(item.ended_at, date)) return false;
		if (date && !item.ended_at) return false;
		return true;
	});

	const totalCount = filtered.length;
	const from = (page - 1) * MATCH_HISTORY_PAGE_SIZE;

	return {
		items: filtered.slice(from, from + MATCH_HISTORY_PAGE_SIZE),
		summary: options.summary,
		sessions,
		page,
		totalCount,
		hasNextPage: from + MATCH_HISTORY_PAGE_SIZE < totalCount,
		hasPrevPage: page > 1,
		resultFilter,
		sessionFilter,
		date
	};
};
