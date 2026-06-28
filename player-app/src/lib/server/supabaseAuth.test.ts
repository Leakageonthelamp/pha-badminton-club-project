import { describe, expect, it, vi } from 'vitest';
import { ensureSupabaseAuth } from './supabaseAuth';

describe('ensureSupabaseAuth', () => {
	it('returns true when getUser resolves a user', async () => {
		const supabase = {
			auth: {
				getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
			}
		};

		await expect(ensureSupabaseAuth(supabase as never)).resolves.toBe(true);
	});

	it('returns false when getUser fails', async () => {
		const supabase = {
			auth: {
				getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('nope') })
			}
		};

		await expect(ensureSupabaseAuth(supabase as never)).resolves.toBe(false);
	});
});
