import { describe, expect, it } from 'vitest';
import {
	normalizeTag,
	TAG_FORMAT_ERROR,
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

	it('rejects wrong length or missing hash', () => {
		expect(validateTag('1234')).toBe(TAG_FORMAT_ERROR);
		expect(validateTag('#123')).toBe(TAG_FORMAT_ERROR);
		expect(validateTag('#12345')).toBe(TAG_FORMAT_ERROR);
	});

	it('rejects invalid characters', () => {
		expect(validateTag('#12-3')).toBe(TAG_FORMAT_ERROR);
		expect(validateTag('#abcd!')).toBe(TAG_FORMAT_ERROR);
	});

	it('normalizes to lowercase', () => {
		expect(normalizeTag('#Ab12')).toBe('#ab12');
	});
});

describe('tag suffix helpers', () => {
	it('strips hash for input display', () => {
		expect(tagSuffixFromFull('#peeo')).toBe('peeo');
	});

	it('builds full tag for submit', () => {
		expect(toFullTag('Ab12')).toBe('#ab12');
	});
});
