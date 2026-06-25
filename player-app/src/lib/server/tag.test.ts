import { describe, expect, it } from 'vitest';
import { randomTag, randomTagSuffix } from '$lib/server/tag';
import { TAG_PATTERN } from '$lib/validation/tag';

describe('randomTag', () => {
	it('generates a valid tag suffix length', () => {
		expect(randomTagSuffix()).toHaveLength(4);
	});

	it('generates a valid full tag', () => {
		expect(TAG_PATTERN.test(randomTag())).toBe(true);
	});
});
