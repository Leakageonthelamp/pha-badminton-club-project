import { describe, expect, it } from 'vitest';
import { configureI18n, initLocale, t, tForLocale } from './i18n.svelte';
import { sharedEn, sharedTh } from './messages';

configureI18n({ th: sharedTh, en: sharedEn });

describe('i18n', () => {
	it('interpolates params', () => {
		initLocale('en');
		expect(t('pagination.pageOf', { page: 2, total: 5 })).toBe('Page 2 of 5');
	});

	it('falls back to English for missing Thai key', () => {
		configureI18n({
			th: {},
			en: { 'test.onlyEn': 'English fallback' }
		});
		expect(tForLocale('th', 'test.onlyEn')).toBe('English fallback');
		configureI18n({ th: sharedTh, en: sharedEn });
	});

	it('has key parity between Thai and English shared catalogs', () => {
		const enKeys = Object.keys(sharedEn).sort();
		const thKeys = Object.keys(sharedTh).sort();
		expect(thKeys).toEqual(enKeys);
	});
});
