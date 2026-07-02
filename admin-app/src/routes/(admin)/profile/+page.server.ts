import { tForLocale } from '$lib/i18n';
import { buildDisplayNameSchema } from '$lib/validation/displayName';
import { buildTagSchema } from '$lib/validation/tag';
import { validateAvatarFile } from '$lib/validation/avatar';
import { loadManagedClubs } from '$lib/server/clubAccess';
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

const buildProfileSchema = (locale: App.Locals['locale']) =>
	z.object({
		displayName: buildDisplayNameSchema(locale),
		tag: buildTagSchema(locale)
	});

export const load: PageServerLoad = async ({ locals: { supabase, user, appRole, locale }, depends }) => {
	authLoadDepends(user!.id, depends);

	const admin = createSupabaseAdminClient();
	await ensureOAuthSignInMethod(admin, user!);

	const { data: profile, error } = await supabase
		.from('profiles')
		.select('*')
		.eq('id', user!.id)
		.single();

	if (error) {
		return {
			profile: null,
			loadError: tForLocale(locale, 'profile.loadError'),
			managedClubs: []
		};
	}

	const managedClubs =
		appRole === 'club_admin' && user
			? (await loadManagedClubs(supabase, user.id, appRole)).map((club) => ({
					id: club.id,
					name: club.name,
					is_active: club.is_active
				}))
			: [];

	return { profile, loadError: null, managedClubs };
};

export const actions: Actions = {
	updateProfile: async ({ request, locals: { supabase, user, locale } }) => {
		const formData = await request.formData();
		const parsed = buildProfileSchema(locale).safeParse({
			displayName: String(formData.get('displayName') ?? ''),
			tag: String(formData.get('tag') ?? '')
		});

		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			return fail(400, {
				error:
					fieldErrors.displayName?.[0] ??
					fieldErrors.tag?.[0] ??
					tForLocale(locale, 'auth.error.invalid_input'),
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

		const tagTaken = tForLocale(locale, 'profile.tagTaken');
		if (existingTag) {
			return fail(400, {
				error: tagTaken,
				fieldErrors: { displayName: null, tag: tagTaken },
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
			const avatarError = validateAvatarFile(avatar, locale);
			if (avatarError) {
				return fail(400, { error: avatarError });
			}

			const path = `${user!.id}/avatar.jpg`;

			const { error: uploadError } = await supabase.storage
				.from('avatars')
				.upload(path, avatar, { upsert: true, contentType: avatar.type });

			if (uploadError) {
				return fail(400, { error: tForLocale(locale, 'profile.uploadError') });
			}

			const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path);
			updates.avatar_url = `${publicUrl.publicUrl}?t=${Date.now()}`;
		}

		const { error } = await supabase.from('profiles').update(updates).eq('id', user!.id);

		if (error) {
			if (error.code === '23505') {
				return fail(400, {
					error: tagTaken,
					fieldErrors: { displayName: null, tag: tagTaken },
					values: {
						displayName: parsed.data.displayName,
						tag: parsed.data.tag
					}
				});
			}

			return fail(400, { error: tForLocale(locale, 'profile.updateError') });
		}

		return { success: true, at: Date.now() };
	},

	updateCredentials: async ({ request, locals: { supabase, user, locale } }) => {
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
				error: tForLocale(locale, 'profile.loadError')
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
