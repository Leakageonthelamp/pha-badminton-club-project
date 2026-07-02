import type {
	SessionHistoryClubOption,
	SessionHistoryItem,
	SessionHistoryPage
} from '$lib/types/session';
import { sessionStatusLabel } from '$lib/types/session';
import { t } from '@repo/ui/i18n';

export const SESSION_HISTORY_PAGE_SIZE = 10;

const HISTORY_STATUS_FILTERS = ['open', 'in_progress', 'closed', 'cancelled'] as const;

export type SessionHistoryStatusFilter = '' | (typeof HISTORY_STATUS_FILTERS)[number];

export const sessionStatusFilterOptions = (): { value: SessionHistoryStatusFilter; label: string }[] => [
	{ value: '', label: t('sessions.history.allStatuses') },
	...HISTORY_STATUS_FILTERS.map((value) => ({
		value,
		label: sessionStatusLabel(value)
	}))
];

export const extractHistoryClubs = (items: SessionHistoryItem[]): SessionHistoryClubOption[] => {
	const map = new Map<string, string>();
	for (const item of items) {
		map.set(item.club_id, item.club_name);
	}
	return [...map.entries()]
		.map(([id, name]) => ({ id, name }))
		.sort((a, b) => a.name.localeCompare(b.name));
};

export const clubFilterOptions = (
	clubs: SessionHistoryClubOption[]
): { value: string; label: string }[] => [
	{ value: '', label: t('sessions.history.allClubs') },
	...clubs.map((club) => ({ value: club.id, label: club.name }))
];

export const parseHistoryPage = (value: string | null): number =>
	Math.max(1, Number(value ?? '1') || 1);

export const parseHistoryDate = (value: string | null): string => {
	if (!value) return '';
	return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
};

export const parseHistoryStatus = (value: string | null): SessionHistoryStatusFilter => {
	const allowed = new Set(sessionStatusFilterOptions().map((option) => option.value));
	return allowed.has(value as SessionHistoryStatusFilter)
		? (value as SessionHistoryStatusFilter)
		: '';
};

export const parseHistoryClub = (value: string | null, allowedIds: Set<string>): string => {
	if (!value || !allowedIds.has(value)) return '';
	return value;
};

export const filterSortPaginateHistory = (
	items: SessionHistoryItem[],
	options: {
		statusFilter: SessionHistoryStatusFilter;
		clubFilter?: string;
		page: number;
		date?: string;
		clubs?: SessionHistoryClubOption[];
	}
): SessionHistoryPage => {
	const page = Math.max(1, options.page);
	const statusFilter = options.statusFilter;
	const clubFilter = options.clubFilter ?? '';
	const date = options.date ?? '';
	const clubs = options.clubs ?? extractHistoryClubs(items);

	const sorted = [...items].sort(
		(a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
	);

	const filtered = sorted.filter((item) => {
		if (statusFilter && item.status !== statusFilter) return false;
		if (clubFilter && item.club_id !== clubFilter) return false;
		return true;
	});

	const totalCount = filtered.length;
	const from = (page - 1) * SESSION_HISTORY_PAGE_SIZE;

	return {
		items: filtered.slice(from, from + SESSION_HISTORY_PAGE_SIZE),
		clubs,
		page,
		totalCount,
		hasNextPage: from + SESSION_HISTORY_PAGE_SIZE < totalCount,
		hasPrevPage: page > 1,
		statusFilter: statusFilter as SessionHistoryPage['statusFilter'],
		clubFilter,
		date
	};
};
