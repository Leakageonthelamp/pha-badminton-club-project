import { configureI18n, initLocale } from '@repo/ui/i18n';
import { sharedEn, sharedTh } from '@repo/ui/i18n/messages';
import { playerEn } from './messages/en';
import { playerTh } from './messages/th';

configureI18n({
	th: { ...sharedTh, ...playerTh },
	en: { ...sharedEn, ...playerEn }
});
initLocale('en');
