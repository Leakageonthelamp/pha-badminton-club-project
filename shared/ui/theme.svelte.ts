/*
 * Shared theme preference (Light / Dark / System) used by both apps.
 * The `.dark` class + color-scheme are applied to <html>; Tailwind's dark
 * variant (see design-system.css `@custom-variant dark`) keys off `.dark`.
 *
 * FOUC is handled by an inline script in each app's app.html that runs this
 * same resolution before paint. This module keeps the store in sync after
 * hydration and reacts to system changes / user toggles.
 */

export type ThemePref = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ph:theme';
const DARK_BG = '#0b1120';
const LIGHT_BG = '#f8fafc';

export const theme = $state<{ pref: ThemePref }>({ pref: 'system' });

let mql: MediaQueryList | null = null;

function readStored(): ThemePref {
	try {
		const v = localStorage.getItem(STORAGE_KEY);
		if (v === 'light' || v === 'dark' || v === 'system') return v;
	} catch {
		/* localStorage may be unavailable (private mode) */
	}
	return 'system';
}

function resolveDark(pref: ThemePref): boolean {
	return pref === 'dark' || (pref === 'system' && !!mql?.matches);
}

function apply(pref: ThemePref) {
	if (typeof document === 'undefined') return;
	const dark = resolveDark(pref);
	const root = document.documentElement;
	root.classList.toggle('dark', dark);
	root.style.colorScheme = dark ? 'dark' : 'light';
	root.style.backgroundColor = dark ? DARK_BG : LIGHT_BG;
	root.style.setProperty('--app-bg', dark ? DARK_BG : LIGHT_BG);
	document
		.querySelector('meta[name="theme-color"]:not([media])')
		?.setAttribute('content', dark ? DARK_BG : LIGHT_BG);
}

/** Call once from each app's root layout (browser only). */
export function initTheme() {
	if (globalThis.window === undefined) return;
	mql = globalThis.window.matchMedia('(prefers-color-scheme: dark)');
	theme.pref = readStored();
	apply(theme.pref);
	mql.addEventListener('change', () => {
		if (theme.pref === 'system') apply('system');
	});
}

export function setThemePref(pref: ThemePref) {
	theme.pref = pref;
	try {
		localStorage.setItem(STORAGE_KEY, pref);
	} catch {
		/* ignore persistence errors */
	}
	apply(pref);
}
