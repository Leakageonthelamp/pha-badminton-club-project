import type { Locale } from '$lib/i18n';
import { tForLocale } from '$lib/i18n';
import { DEFAULT_LOCALE } from '@repo/ui/i18n';
import {
	AVATAR_INPUT_MAX_BYTES,
	AVATAR_INPUT_MAX_MB,
	AVATAR_MAX_BYTES,
	AVATAR_MAX_KB,
	AVATAR_OUTPUT_FILENAME,
	AVATAR_OUTPUT_SIZE,
	AVATAR_OUTPUT_TYPE,
	cropAvatarToFile as cropAvatarToFileCore,
	normalizeImageForCrop as normalizeImageForCropCore,
	type CropArea
} from '$lib/images/cropAvatar';

export {
	AVATAR_INPUT_MAX_BYTES,
	AVATAR_INPUT_MAX_MB,
	AVATAR_MAX_BYTES,
	AVATAR_MAX_KB,
	AVATAR_OUTPUT_FILENAME,
	AVATAR_OUTPUT_SIZE,
	AVATAR_OUTPUT_TYPE
};
export type { CropArea };

export function validateAvatarInput(
	file: File | null | undefined,
	locale: Locale = DEFAULT_LOCALE
): string | null {
	if (!file) return tForLocale(locale, 'validation.avatar.choose');

	if (!file.type.startsWith('image/')) {
		return tForLocale(locale, 'validation.avatar.imageOnly');
	}

	if (file.size > AVATAR_INPUT_MAX_BYTES) {
		return tForLocale(locale, 'validation.avatar.inputTooLarge', { max: AVATAR_INPUT_MAX_MB });
	}

	return null;
}

export function validateAvatarFile(
	file: File | null | undefined,
	locale: Locale = DEFAULT_LOCALE
): string | null {
	if (!file || file.size === 0) return null;

	if (!file.type.startsWith('image/')) {
		return tForLocale(locale, 'validation.avatar.imageOnly');
	}

	if (file.size > AVATAR_MAX_BYTES) {
		return tForLocale(locale, 'validation.avatar.outputTooLarge', { max: AVATAR_MAX_KB });
	}

	return null;
}

export async function normalizeImageForCrop(file: File, locale: Locale = DEFAULT_LOCALE): Promise<string> {
	try {
		return await normalizeImageForCropCore(file);
	} catch {
		throw new Error(tForLocale(locale, 'validation.avatar.cropPrepare'));
	}
}

export async function cropAvatarToFile(
	imageSrc: string,
	crop: CropArea,
	outputSize = AVATAR_OUTPUT_SIZE,
	locale: Locale = DEFAULT_LOCALE
): Promise<File> {
	try {
		return await cropAvatarToFileCore(imageSrc, crop, outputSize);
	} catch {
		throw new Error(tForLocale(locale, 'validation.avatar.cropFailed'));
	}
}
