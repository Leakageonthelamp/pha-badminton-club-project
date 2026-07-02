import { configureI18n as configureSharedI18n } from '@repo/ui/i18n';
import { sharedEn, sharedTh } from '@repo/ui/i18n/messages';
import { landingEn } from './messages/en';
import { landingTh } from './messages/th';

export function configureI18n() {
	configureSharedI18n({
		en: { ...sharedEn, ...landingEn },
		th: { ...sharedTh, ...landingTh }
	});
}

configureI18n();

export { initLocale, setLocale, t, tForLocale, i18n } from '@repo/ui/i18n';
export { LOCALES, LOCALE_LABELS, type Locale } from '@repo/ui/i18n';
