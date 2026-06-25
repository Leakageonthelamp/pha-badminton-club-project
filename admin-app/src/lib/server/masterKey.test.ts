import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { hashMasterKey, verifyMasterKey } from './masterKey';

describe('verifyMasterKey', () => {
	const raw = 'test-master-secret';
	const hex = createHash('sha256').update(raw).digest('hex');

	it('accepts the correct raw key', () => {
		expect(verifyMasterKey(raw, hex)).toBe(true);
	});

	it('rejects a wrong raw key', () => {
		expect(verifyMasterKey('wrong-key', hex)).toBe(false);
	});

	it('rejects empty raw key', () => {
		expect(verifyMasterKey('', hex)).toBe(false);
	});

	it('rejects invalid hex env value', () => {
		expect(verifyMasterKey(raw, 'not-hex')).toBe(false);
	});

	it('hashMasterKey matches node crypto', () => {
		expect(hashMasterKey(raw).equals(Buffer.from(hex, 'hex'))).toBe(true);
	});
});
