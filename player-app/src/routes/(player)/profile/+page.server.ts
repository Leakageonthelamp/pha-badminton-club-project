import { displayNameSchema } from '$lib/validation/displayName';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';

const profileSchema = z.object({
	displayName: displayNameSchema
});

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	const { data: profile, error } = await supabase
		.from('profiles')
		.select('*')
		.eq('id', user!.id)
		.single();

	if (error) {
		return { profile: null, loadError: 'Could not load your profile.' };
	}

	return { profile, loadError: null };
};

export const actions: Actions = {
	updateProfile: async ({ request, locals: { supabase, user } }) => {
		const formData = await request.formData();
		const parsed = profileSchema.safeParse({
			displayName: String(formData.get('displayName') ?? '')
		});

		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.flatten().fieldErrors.displayName?.[0] ?? 'Invalid display name'
			});
		}

		const avatar = formData.get('avatar');
		const updates: { display_name: string; avatar_url?: string } = {
			display_name: parsed.data.displayName
		};

		if (avatar instanceof File && avatar.size > 0) {
			if (!avatar.type.startsWith('image/')) {
				return fail(400, { error: 'Avatar must be an image file.' });
			}

			if (avatar.size > 2 * 1024 * 1024) {
				return fail(400, { error: 'Avatar must be 2 MB or smaller.' });
			}

			const extension = avatar.name.split('.').pop()?.toLowerCase() ?? 'jpg';
			const path = `${user!.id}/avatar.${extension}`;

			const { error: uploadError } = await supabase.storage
				.from('avatars')
				.upload(path, avatar, { upsert: true, contentType: avatar.type });

			if (uploadError) {
				return fail(400, { error: 'Could not upload avatar. Please try again.' });
			}

			const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path);
			updates.avatar_url = `${publicUrl.publicUrl}?t=${Date.now()}`;
		}

		const { error } = await supabase.from('profiles').update(updates).eq('id', user!.id);

		if (error) {
			return fail(400, { error: 'Could not update profile. Please try again.' });
		}

		return { success: true };
	}
};
