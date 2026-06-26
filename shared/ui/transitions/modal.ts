export const modalBackdropTransition = { duration: 200 };

export const modalPanelTransition = { duration: 240, y: 14 };

export const modalPanelTransitionReduced = { duration: 0, y: 0 };

export const bottomBannerTransition = { duration: 240, y: 24 };

export const bottomBannerTransitionReduced = { duration: 0, y: 0 };

export const prefersReducedMotion = (): boolean =>
	typeof window !== 'undefined' &&
	window.matchMedia('(prefers-reduced-motion: reduce)').matches;
