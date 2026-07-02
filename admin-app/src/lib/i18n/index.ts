import { configureI18n, initLocale, setLocale, t, tForLocale } from '@repo/ui/i18n';
import { sharedEn, sharedTh } from '@repo/ui/i18n/messages';
import { adminEn } from './messages/en';
import { adminTh } from './messages/th';

configureI18n({
	en: { ...sharedEn, ...adminEn },
	th: { ...sharedTh, ...adminTh }
});

export { initLocale, setLocale, t, tForLocale };
export type { Locale } from '@repo/ui/i18n';
