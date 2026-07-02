import { configureI18n, type Locale } from '@repo/ui/i18n';
import { sharedEn, sharedTh } from '@repo/ui/i18n/messages';
import { playerEn } from './messages/en';
import { playerTh } from './messages/th';

export const catalog: Record<Locale, Record<string, string>> = {
	th: { ...sharedTh, ...playerTh },
	en: { ...sharedEn, ...playerEn }
};

configureI18n(catalog);
