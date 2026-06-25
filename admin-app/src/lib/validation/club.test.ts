import { describe, expect, it } from 'vitest';
import { clubInputSchema } from './club';

describe('clubInputSchema', () => {
	it('accepts valid club input', () => {
		const result = clubInputSchema.safeParse({
			name: 'PH Club',
			description: 'A test club',
			max_active_sessions: '5'
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.max_active_sessions).toBe(5);
		}
	});

	it('rejects empty name', () => {
		const result = clubInputSchema.safeParse({
			name: '',
			description: '',
			max_active_sessions: 1
		});

		expect(result.success).toBe(false);
	});

	it('rejects max sessions below 1', () => {
		const result = clubInputSchema.safeParse({
			name: 'PH Club',
			description: '',
			max_active_sessions: 0
		});

		expect(result.success).toBe(false);
	});
});
