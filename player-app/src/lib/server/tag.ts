import type { SupabaseClient } from '@supabase/supabase-js';
import { toFullTag } from '$lib/validation/tag';

const TAG_SUFFIX_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const MAX_ATTEMPTS = 20;

export const randomTagSuffix = (): string => {
	let suffix = '';
	for (let i = 0; i < 4; i++) {
		suffix += TAG_SUFFIX_CHARS[Math.floor(Math.random() * TAG_SUFFIX_CHARS.length)]!;
	}
	return suffix;
};

export const randomTag = (): string => toFullTag(randomTagSuffix());

/** Assign a unique tag when the DB trigger did not (or tag column was empty). */
export async function ensureProfileTag(
	admin: SupabaseClient,
	userId: string
): Promise<string | null> {
	const { data: profile } = await admin.from('profiles').select('tag').eq('id', userId).maybeSingle();

	if (profile?.tag) {
		return profile.tag;
	}

	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		const { data: generated, error: rpcError } = await admin.rpc('generate_unique_tag');
		const tag = typeof generated === 'string' && generated.length > 0 ? generated : randomTag();

		if (rpcError && attempt === 0) {
			// ponytail: RPC missing if migration not applied — fall back to local random only
		}

		const { data: updated, error } = await admin
			.from('profiles')
			.update({ tag })
			.eq('id', userId)
			.select('tag')
			.maybeSingle();

		if (!error && updated?.tag) {
			return updated.tag;
		}

		if (error?.code === '23505') {
			continue;
		}

		if (error) {
			return null;
		}
	}

	return null;
}
