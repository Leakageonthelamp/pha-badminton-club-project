import { LOCALE_COOKIE, parseLocale, type Locale } from './locale';
import type { Handle } from '@sveltejs/kit';

export const localeHandle: Handle = async ({ event, resolve }) => {
	event.locals.locale = parseLocale(event.cookies.get(LOCALE_COOKIE));

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.locale)
	});
};

export type { Locale };
