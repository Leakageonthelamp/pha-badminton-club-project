import '$lib/i18n';
import { initLocale } from '@repo/ui/i18n';
import type { LayoutLoad } from './$types';

/** Runs on server and client before layout render — keeps i18n locale in sync without Svelte prop warnings. */
export const load: LayoutLoad = ({ data }) => {
	initLocale(data.locale);
	return data;
};
