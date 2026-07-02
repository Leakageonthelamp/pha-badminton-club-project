import { t } from '@repo/ui/i18n';
import {
	AVATAR_INPUT_MAX_BYTES,
	AVATAR_INPUT_MAX_MB,
	AVATAR_MAX_BYTES,
	AVATAR_MAX_KB,
	AVATAR_OUTPUT_FILENAME,
	AVATAR_OUTPUT_SIZE,
	AVATAR_OUTPUT_TYPE
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

export function validateAvatarInput(file: File | null | undefined): string | null {
	if (!file) return t('validation.avatar.choose');

	if (!file.type.startsWith('image/')) {
		return t('validation.avatar.mustBeImage');
	}

	if (file.size > AVATAR_INPUT_MAX_BYTES) {
		return t('validation.avatar.inputTooLarge', { max: AVATAR_INPUT_MAX_MB });
	}

	return null;
}

export function validateAvatarFile(file: File | null | undefined): string | null {
	if (!file || file.size === 0) return null;

	if (!file.type.startsWith('image/')) {
		return t('validation.avatar.mustBeImage');
	}

	if (file.size > AVATAR_MAX_BYTES) {
		return t('validation.avatar.outputTooLarge', { max: AVATAR_MAX_KB });
	}

	return null;
}
