import {
	buildSlipStoragePath,
	SLIP_OUTPUT_TYPE,
	type SlipKind,
	validateSlipFile
} from '$lib/images/compressSlip';
import { createSupabaseAdminClient } from '$lib/supabase/server';
import { t } from '@repo/ui/i18n';

export const uploadSlip = async (
	userId: string,
	kind: SlipKind,
	key: string,
	file: File
): Promise<{ ok: true; path: string } | { ok: false; message: string }> => {
	const validationError = validateSlipFile(file);
	if (validationError) {
		return { ok: false, message: validationError };
	}

	const path = buildSlipStoragePath(userId, kind, key);
	const { error } = await createSupabaseAdminClient().storage.from('payment-slips').upload(path, file, {
		upsert: true,
		contentType: SLIP_OUTPUT_TYPE
	});

	if (error) {
		return { ok: false, message: error.message };
	}

	return { ok: true, path };
};

export const readSlipFromForm = (
	formData: FormData
): { ok: true; file: File } | { ok: false; message: string } => {
	const slip = formData.get('slip');
	if (!(slip instanceof File) || slip.size === 0) {
		return { ok: false, message: t('payments.slip.required') };
	}

	return { ok: true, file: slip };
};
