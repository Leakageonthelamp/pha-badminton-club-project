import { type Locale, DEFAULT_LOCALE, LOCALE_COOKIE, parseLocale } from './locale';

export type { Locale };

type Dict = Record<string, string>;

export const i18n = $state<{ locale: Locale }>({ locale: DEFAULT_LOCALE });

let catalogs: Record<Locale, Dict> = { th: {}, en: {} };

const interpolate = (msg: string, params?: Record<string, string | number>): string =>
	params ? msg.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`)) : msg;

const lookup = (locale: Locale, key: string): string =>
	catalogs[locale]?.[key] ?? catalogs.en[key] ?? key;

/** Configure merged message catalogs once per app entry. */
export function configureI18n(next: Record<Locale, Dict>) {
	catalogs = next;
}

/** Sync reactive locale from SSR layout data (call synchronously in root layout script). */
export function initLocale(locale: Locale) {
	i18n.locale = parseLocale(locale);
}

/** Reactive translator for Svelte components (tracks i18n.locale). */
export function t(key: string, params?: Record<string, string | number>): string {
	return interpolate(lookup(i18n.locale, key), params);
}

/** Non-reactive translator for server loads and pure helpers. */
export function tForLocale(
	locale: Locale,
	key: string,
	params?: Record<string, string | number>
): string {
	return interpolate(lookup(parseLocale(locale), key), params);
}

export function setLocale(locale: Locale) {
	i18n.locale = parseLocale(locale);
	if (typeof document === 'undefined') return;
	document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`;
}
