import type { SupabaseClient, User } from '@supabase/supabase-js';

const isHostedAvatar = (url: string): boolean =>
	url.includes('/storage/v1/object/public/avatars') || url.includes('/object/public/avatars');

export const oauthAvatarFromUser = (user: User): string | null => {
	const meta = user.user_metadata ?? {};
	const url = meta.avatar_url ?? meta.picture;
	return typeof url === 'string' && url.length > 0 ? url : null;
};

/** Sync Google/Facebook photo into profiles when the user has not uploaded their own avatar. */
export async function ensureOAuthProfileAvatar(
	admin: SupabaseClient,
	user: User
): Promise<void> {
	const oauthAvatar = oauthAvatarFromUser(user);
	if (!oauthAvatar) return;

	const { data: profile } = await admin
		.from('profiles')
		.select('avatar_url')
		.eq('id', user.id)
		.maybeSingle();

	if (profile?.avatar_url && isHostedAvatar(profile.avatar_url)) return;
	if (profile?.avatar_url === oauthAvatar) return;

	await admin.from('profiles').update({ avatar_url: oauthAvatar }).eq('id', user.id);
}
