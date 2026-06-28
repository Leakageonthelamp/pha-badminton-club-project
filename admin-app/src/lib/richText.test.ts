import { describe, expect, it } from 'vitest';
import { richTextEquivalent } from '@repo/ui/richText';

describe('richTextEquivalent', () => {
	it('treats identical strings as equivalent', () => {
		expect(richTextEquivalent('<p>Hello</p>', '<p>Hello</p>')).toBe(true);
	});

	it('treats plain text and TipTap paragraph wrap as equivalent', () => {
		expect(richTextEquivalent('Hello world', '<p>Hello world</p>')).toBe(true);
	});

	it('detects formatting-only HTML changes', () => {
		expect(richTextEquivalent('<p>Hello</p>', '<p><strong>Hello</strong></p>')).toBe(false);
	});

	it('detects text content changes', () => {
		expect(richTextEquivalent('<p>Hello</p>', '<p>Goodbye</p>')).toBe(false);
	});

	it('treats empty values as equivalent', () => {
		expect(richTextEquivalent('', '<p></p>')).toBe(true);
	});
});
