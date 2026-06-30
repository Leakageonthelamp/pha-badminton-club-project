/** Min time tab/app was hidden before refetching server data on return. */
export const APP_HIDDEN_REVALIDATE_MS = 30_000;

/** Call `onRevalidate` only after the page was hidden longer than `thresholdMs`. */
export const attachVisibilityRevalidate = (
	onRevalidate: () => void,
	thresholdMs = APP_HIDDEN_REVALIDATE_MS
): (() => void) => {
	let hiddenAt: number | null = null;

	const onVisibilityChange = () => {
		if (document.visibilityState === 'hidden') {
			hiddenAt = Date.now();
			return;
		}

		if (document.visibilityState !== 'visible' || hiddenAt === null) return;

		if (Date.now() - hiddenAt >= thresholdMs) onRevalidate();
		hiddenAt = null;
	};

	document.addEventListener('visibilitychange', onVisibilityChange);
	return () => document.removeEventListener('visibilitychange', onVisibilityChange);
};
