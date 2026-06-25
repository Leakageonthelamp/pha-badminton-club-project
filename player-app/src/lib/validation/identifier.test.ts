import { describe, expect, it } from 'vitest';
import {
	getIdentifierKind,
	isEmail,
	normalizePhone,
	validateIdentifier
} from '$lib/validation/identifier';

describe('normalizePhone', () => {
	it('converts 0-prefixed Thai mobile numbers', () => {
		expect(normalizePhone('0812345678')).toBe('+66812345678');
	});

	it('accepts numbers already in +66 format', () => {
		expect(normalizePhone('+66812345678')).toBe('+66812345678');
	});

	it('accepts numbers starting with 66 without plus', () => {
		expect(normalizePhone('66812345678')).toBe('+66812345678');
	});

	it('ignores spaces and dashes', () => {
		expect(normalizePhone('081-234-5678')).toBe('+66812345678');
	});

	it('returns null for invalid numbers', () => {
		expect(normalizePhone('12345')).toBeNull();
		expect(normalizePhone('not-a-phone')).toBeNull();
	});
});

describe('isEmail', () => {
	it('detects valid emails', () => {
		expect(isEmail('player@example.com')).toBe(true);
		expect(isEmail('  Player@Example.COM  ')).toBe(true);
	});

	it('rejects non-emails', () => {
		expect(isEmail('0812345678')).toBe(false);
		expect(isEmail('player@')).toBe(false);
	});
});

describe('validateIdentifier', () => {
	it('validates email format when input looks like email', () => {
		expect(validateIdentifier('player@example.com')).toBeNull();
		expect(validateIdentifier('player@')).toBe('Enter a valid email address');
	});

	it('validates phone format when input looks like phone', () => {
		expect(validateIdentifier('0812345678')).toBeNull();
		expect(validateIdentifier('08123')).toBe(
			'Enter a valid Thai phone number (e.g. 0812345678)'
		);
	});

	it('detects identifier kind from input', () => {
		expect(getIdentifierKind('player@example.com')).toBe('email');
		expect(getIdentifierKind('0812345678')).toBe('phone');
	});
});
