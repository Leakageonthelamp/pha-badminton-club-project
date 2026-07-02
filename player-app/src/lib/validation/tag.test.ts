import { t } from '@repo/ui/i18n';
import { describe, expect, it } from 'vitest';
import {
	normalizeTag,
	tagSuffixFromFull,
	toFullTag,
	validateTag
} from './tag';

describe('validateTag', () => {
	it('accepts valid tags', () => {
		expect(validateTag('#1234')).toBeNull();
		expect(validateTag('#sd23')).toBeNull();
		expect(validateTag('#Ab9Z')).toBeNull();
	});

	it('rejects invalid formats', () => {
		const invalid = t('validation.tag.invalid');
		expect(validateTag('1234')).toBe(invalid);
		expect(validateTag('#123')).toBe(invalid);
		expect(validateTag('#12345')).toBe(invalid);
	});

	it('rejects non-alphanumeric suffix characters', () => {
		const invalid = t('validation.tag.invalid');
		expect(validateTag('#12-3')).toBe(invalid);
		expect(validateTag('#abcd!')).toBe(invalid);
	});
});

describe('tag helpers', () => {
	it('normalizes tags to lowercase', () => {
		expect(normalizeTag('#Ab12')).toBe('#ab12');
	});

	it('extracts suffix from full tag', () => {
		expect(tagSuffixFromFull('#ab12')).toBe('ab12');
		expect(tagSuffixFromFull('ab12')).toBe('ab12');
	});

	it('builds full tag from suffix', () => {
		expect(toFullTag('Ab12')).toBe('#ab12');
	});
});
