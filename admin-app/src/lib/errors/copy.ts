import type { Locale } from '@repo/ui/i18n';
import { DEFAULT_LOCALE } from '@repo/ui/i18n';
import { tForLocale } from '@repo/ui/i18n/i18n.svelte';

type ErrorCopy = {
	title: string;
	hint: string;
};

const errorKeysByStatus: Record<number, { title: string; hint: string }> = {
	400: { title: 'error.invalidRequest.title', hint: 'error.invalidRequest.hint' },
	401: { title: 'error.signInRequired.title', hint: 'error.signInRequired.hint' },
	403: { title: 'error.accessDenied.title', hint: 'error.accessDenied.hint' },
	404: { title: 'error.notFound.title', hint: 'error.notFound.hint' },
	500: { title: 'error.server.title', hint: 'error.server.hint' },
	503: { title: 'error.unavailable.title', hint: 'error.unavailable.hint' }
};

export const getErrorCopy = (status: number, locale: Locale = DEFAULT_LOCALE): ErrorCopy => {
	const keys = errorKeysByStatus[status] ?? errorKeysByStatus[500];
	return {
		title: tForLocale(locale, keys.title),
		hint: tForLocale(locale, keys.hint)
	};
};
