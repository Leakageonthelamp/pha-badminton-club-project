export const PAGE_SIZE = 10;

export const DASHBOARD_PREVIEW_LIMIT = 5;

export type PaginatedSlice<T> = {
	items: T[];
	page: number;
	totalPages: number;
	totalCount: number;
	hasPrev: boolean;
	hasNext: boolean;
};

export const paginate = <T>(
	items: readonly T[],
	page: number,
	pageSize: number = PAGE_SIZE
): PaginatedSlice<T> => {
	const totalCount = items.length;
	const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
	const clampedPage = Math.min(Math.max(1, page), totalPages);
	const from = (clampedPage - 1) * pageSize;

	return {
		items: items.slice(from, from + pageSize),
		page: clampedPage,
		totalPages,
		totalCount,
		hasPrev: clampedPage > 1,
		hasNext: clampedPage < totalPages
	};
};
