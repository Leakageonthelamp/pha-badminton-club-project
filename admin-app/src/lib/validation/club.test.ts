import '$lib/i18n';
import { describe, expect, it } from 'vitest';
import { CLUB_DESCRIPTION_MAX_LENGTH, CLUB_NAME_MAX_LENGTH } from '$lib/config/club';
import { clubInputSchema } from './club';

describe('clubInputSchema', () => {
	it('accepts valid club input', () => {
		const result = clubInputSchema.safeParse({
			name: 'PH Club',
			description: 'A test club',
			max_active_sessions: '5',
			max_admins: '2',
			is_active: 'true'
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.max_active_sessions).toBe(5);
			expect(result.data.max_admins).toBe(2);
			expect(result.data.is_active).toBe(true);
		}
	});

	it('parses inactive flag', () => {
		const result = clubInputSchema.safeParse({
			name: 'PH Club',
			description: '',
			max_active_sessions: 1,
			max_admins: 1,
			is_active: 'false'
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.is_active).toBe(false);
		}
	});

	it('rejects empty name', () => {
		const result = clubInputSchema.safeParse({
			name: '',
			description: '',
			max_active_sessions: 1,
			max_admins: 1,
			is_active: true
		});

		expect(result.success).toBe(false);
	});

	it('rejects name over max length', () => {
		const result = clubInputSchema.safeParse({
			name: 'a'.repeat(CLUB_NAME_MAX_LENGTH + 1),
			description: '',
			max_active_sessions: 1,
			max_admins: 1,
			is_active: true
		});

		expect(result.success).toBe(false);
	});

	it('rejects description over max length', () => {
		const result = clubInputSchema.safeParse({
			name: 'PH Club',
			description: 'a'.repeat(CLUB_DESCRIPTION_MAX_LENGTH + 1),
			max_active_sessions: 1,
			max_admins: 1,
			is_active: true
		});

		expect(result.success).toBe(false);
	});

	it('rejects max sessions below 1', () => {
		const result = clubInputSchema.safeParse({
			name: 'PH Club',
			description: '',
			max_active_sessions: 0,
			max_admins: 1,
			is_active: true
		});

		expect(result.success).toBe(false);
	});

	it('rejects max admins below 1', () => {
		const result = clubInputSchema.safeParse({
			name: 'PH Club',
			description: '',
			max_active_sessions: 1,
			max_admins: 0,
			is_active: true
		});

		expect(result.success).toBe(false);
	});
});
