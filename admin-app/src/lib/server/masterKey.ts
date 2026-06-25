import { createHash, timingSafeEqual } from 'node:crypto';

export const hashMasterKey = (rawKey: string): Buffer =>
	createHash('sha256').update(rawKey).digest();

export const verifyMasterKey = (rawKey: string, expectedSha256Hex: string): boolean => {
	if (!rawKey || !expectedSha256Hex || !/^[0-9a-f]{64}$/i.test(expectedSha256Hex)) {
		return false;
	}

	const actual = hashMasterKey(rawKey);
	const expected = Buffer.from(expectedSha256Hex, 'hex');

	if (actual.length !== expected.length) {
		return false;
	}

	return timingSafeEqual(actual, expected);
};
