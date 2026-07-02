import { DEFAULT_LOCALE, tForLocale, type Locale } from '@repo/ui/i18n';

type ErrorCopy = {
	title: string;
	hint: string;
};

const ERROR_STATUSES = [400, 401, 403, 404, 500, 503] as const;

export const getErrorCopy = (status: number, locale?: Locale): ErrorCopy => {
	const resolvedLocale = locale ?? DEFAULT_LOCALE;

	if (ERROR_STATUSES.includes(status as (typeof ERROR_STATUSES)[number])) {
		return {
			title: tForLocale(resolvedLocale, `errors.${status}.title`),
			hint: tForLocale(resolvedLocale, `errors.${status}.hint`)
		};
	}

	return {
		title: tForLocale(resolvedLocale, 'errors.500.title'),
		hint: tForLocale(resolvedLocale, 'errors.500.hint')
	};
};
