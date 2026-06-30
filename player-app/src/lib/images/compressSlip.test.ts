import { describe, expect, it } from 'vitest';
import {
	buildSlipStoragePath,
	SLIP_MAX_BYTES,
	validateSlipFile,
	validateSlipInput
} from './compressSlip';

describe('buildSlipStoragePath', () => {
	it('builds session payment path', () => {
		expect(buildSlipStoragePath('user-1', 'session_payment', 'session-9')).toBe(
			'user-1/session_payment/session-9.jpg'
		);
	});

	it('builds cancellation fee path', () => {
		expect(buildSlipStoragePath('user-1', 'cancellation_fee', 'player-2')).toBe(
			'user-1/cancellation_fee/player-2.jpg'
		);
	});
});

describe('validateSlipInput', () => {
	it('rejects missing file', () => {
		expect(validateSlipInput(null)).toMatch(/choose/i);
	});

	it('rejects non-image', () => {
		const file = new File(['x'], 'slip.pdf', { type: 'application/pdf' });
		expect(validateSlipInput(file)).toMatch(/image/i);
	});
});

describe('validateSlipFile', () => {
	it('rejects empty file', () => {
		const file = new File([], 'slip.jpg', { type: 'image/jpeg' });
		expect(validateSlipFile(file)).toMatch(/choose/i);
	});

	it('rejects oversized processed file', () => {
		const file = new File([new Uint8Array(SLIP_MAX_BYTES + 1)], 'slip.jpg', {
			type: 'image/jpeg'
		});
		expect(validateSlipFile(file)).toMatch(/kb/i);
	});

	it('accepts valid jpeg', () => {
		const file = new File([new Uint8Array(1024)], 'slip.jpg', { type: 'image/jpeg' });
		expect(validateSlipFile(file)).toBeNull();
	});
});
