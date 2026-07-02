export type Locale = 'th' | 'en';

export const LOCALES: Locale[] = ['th', 'en'];
export const DEFAULT_LOCALE: Locale = 'th';
export const LOCALE_COOKIE = 'ph:lang';

export const LOCALE_LABELS: Record<Locale, string> = {
	th: 'ไทย',
	en: 'English'
};

export const parseLocale = (value: string | undefined | null): Locale =>
	value === 'en' || value === 'th' ? value : DEFAULT_LOCALE;
