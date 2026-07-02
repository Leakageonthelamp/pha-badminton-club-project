import { displayNameSchema } from '$lib/validation/displayName';
import { tagSchema } from '$lib/validation/tag';
import { validateAvatarFile } from '$lib/validation/avatar';
import {
	ensureOAuthSignInMethod,
	updateProfileCredentials,
	type CredentialsInput
} from '$lib/server/profileCredentials';
import { authLoadDepends } from '$lib/navigation/authCache';
import { loadOutstandingFees, submitCancellationFee } from '$lib/server/sessions';
import { readSlipFromForm, uploadSlip } from '$lib/server/slips';
import { ensureSupabaseAuth } from '$lib/server/supabaseAuth';
import { loadPlayerTransactions } from '$lib/server/transactions';
import {
	parseTransactionDateFilter,
	parseTransactionPage,
	parseTransactionStatusFilter
} from '$lib/transactions/list';
import { createSupabaseAdminClient } from '$lib/supabase/server';
import { tForLocale } from '@repo/ui/i18n';
import { fail } from '@sveltejs/kit';
import type { PlayerTransactionPage } from '$lib/types/transaction';
import type { PasswordSignInPreference } from '$lib/types/auth';
import type { Actions, PageServerLoad } from './$types';
import { z } from 'zod';

const emptyTransactions = (): PlayerTransactionPage => ({
	items: [],
	page: 1,
	totalCount: 0,
	hasNextPage: false,
	hasPrevPage: false,
	statusFilter: '',
	date: ''
});

const profileSchema = z.object({
	displayName: displayNameSchema,
	tag: tagSchema
});

export const load: PageServerLoad = async ({ url, locals: { supabase, user, locale }, depends }) => {
	authLoadDepends(user!.id, depends);
	depends('app:profile');

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
			outstandingFees: [],
			transactions: emptyTransactions()
		};
	}

	const [outstandingFees, transactions] = await Promise.all([
		loadOutstandingFees(supabase, user!.id),
		loadPlayerTransactions(supabase, {
			userId: user!.id,
			page: parseTransactionPage(url.searchParams.get('txPage')),
			statusFilter: parseTransactionStatusFilter(url.searchParams.get('txStatus')),
			date: parseTransactionDateFilter(url.searchParams.get('txDate'))
		})
	]);

	return { profile, loadError: null, outstandingFees, transactions };
};

export const actions: Actions = {
	updateProfile: async ({ request, locals: { supabase, user, locale } }) => {
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

		if (existingTag) {
			const tagTaken = tForLocale(locale, 'validation.tag.taken');
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
			const avatarError = validateAvatarFile(avatar);
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
				const tagTaken = tForLocale(locale, 'validation.tag.taken');
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
			input,
			locale
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
	},

	submitFee: async ({ request, locals: { supabase, user, locale } }) => {
		if (!user) {
			return fail(401, { error: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const formData = await request.formData();
		const playerId = String(formData.get('player_id') ?? '');
		if (!playerId) {
			return fail(400, { error: tForLocale(locale, 'validation.feeRecord.required') });
		}

		const slipInput = readSlipFromForm(formData);
		if (!slipInput.ok) {
			return fail(400, { error: slipInput.message });
		}

		const upload = await uploadSlip(user.id, 'cancellation_fee', playerId, slipInput.file);
		if (!upload.ok) {
			return fail(400, { error: upload.message });
		}

		if (!(await ensureSupabaseAuth(supabase))) {
			return fail(401, { error: tForLocale(locale, 'auth.error.signInRequired') });
		}

		const result = await submitCancellationFee(supabase, playerId, upload.path);
		if (!result.ok) {
			return fail(400, { error: result.message });
		}

		return {
			feeAction: true,
			feeSuccess: true,
			feeAt: Date.now(),
			playerId
		};
	}
};
