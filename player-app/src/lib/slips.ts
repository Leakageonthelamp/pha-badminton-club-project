export const slipPreviewUrl = (path: string): string =>
	`/slips?path=${encodeURIComponent(path)}`;
