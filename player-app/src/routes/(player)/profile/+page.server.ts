import { displayNameSchema } from '$lib/validation/displayName';
import { tagSchema } from '$lib/validation/tag';
import { validateAvatarFile } from '$lib/validation/avatar';
import {
	ensureOAuthSignInMethod,
	updateProfileCredentials,
	type CredentialsInput
} from '$lib/server/profileCredentials';
import { authLoadDepends } from '$lib/navigation/authCache';
import { createSupabaseAdminClient } from '$lib/supabase/server';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { PasswordSignInPreference } from '$lib/types/auth';
import { z } from 'zod';

const profileSchema = z.object({
	displayName: displayNameSchema,
	tag: tagSchema
});

export const load: PageServerLoad = async ({ locals: { supabase, user }, depends }) => {
	authLoadDepends(user!.id, depends);

	const admin = createSupabaseAdminClient();
	await ensureOAuthSignInMethod(admin, user!);

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
			displayName: String(formData.get('displayName') ?? ''),
			tag: String(formData.get('tag') ?? '')
		});

		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				error:
					fieldErrors.displayName?.[0] ??
					fieldErrors.tag?.[0] ??
					'Please check your input and try again.',
				fieldErrors: {
					displayName: fieldErrors.displayName?.[0] ?? null,
					tag: fieldErrors.tag?.[0] ?? null
				},
				values: {
					displayName: String(formData.get('displayName') ?? ''),
					tag: String(formData.get('tag') ?? '')
				}
			});
		}

		const admin = createSupabaseAdminClient();
		const { data: existingTag } = await admin
			.from('profiles')
			.select('id')
			.eq('tag', parsed.data.tag)
			.neq('id', user!.id)
			.maybeSingle();

		if (existingTag) {
			return fail(400, {
				error: 'This tag is already taken. Choose another.',
				fieldErrors: { displayName: null, tag: 'This tag is already taken. Choose another.' },
				values: {
					displayName: parsed.data.displayName,
					tag: parsed.data.tag
				}
			});
		}

		const avatar = formData.get('avatar');
		const updates: { display_name: string; tag: string; avatar_url?: string } = {
			display_name: parsed.data.displayName,
			tag: parsed.data.tag
		};

		if (avatar instanceof File && avatar.size > 0) {
			const avatarError = validateAvatarFile(avatar);
			if (avatarError) {
				return fail(400, { error: avatarError });
			}

			const path = `${user!.id}/avatar.jpg`;

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
			if (error.code === '23505') {
				return fail(400, {
					error: 'This tag is already taken. Choose another.',
					fieldErrors: { displayName: null, tag: 'This tag is already taken. Choose another.' },
					values: {
						displayName: parsed.data.displayName,
						tag: parsed.data.tag
					}
				});
			}

			return fail(400, { error: 'Could not update profile. Please try again.' });
		}

		return { success: true, at: Date.now() };
	},

	updateCredentials: async ({ request, locals: { supabase, user } }) => {
		const formData = await request.formData();
		const input: CredentialsInput = {
			email: String(formData.get('email') ?? ''),
			phone: String(formData.get('phone') ?? ''),
			signInPreference: String(formData.get('signInPreference') ?? 'email') as PasswordSignInPreference,
			currentPassword: String(formData.get('currentPassword') ?? '')
		};

		const { data: profile, error: loadError } = await supabase
			.from('profiles')
			.select('email, phone, sign_in_method')
			.eq('id', user!.id)
			.single();

		if (loadError || !profile) {
			return fail(400, {
				credentialsAction: true,
				error: 'Could not load your profile.'
			});
		}

		const admin = createSupabaseAdminClient();
		const result = await updateProfileCredentials({
			admin,
			supabase,
			userId: user!.id,
			profile,
			input
		});

		if (!result.ok) {
			return fail(400, {
				credentialsAction: true,
				error: result.error,
				fieldErrors: result.fieldErrors,
				values: result.values
			});
		}

		return {
			credentialsAction: true,
			credentialsSuccess: true,
			credentialsAt: Date.now(),
			signInPreference: result.signInPreference
		};
	}
};
