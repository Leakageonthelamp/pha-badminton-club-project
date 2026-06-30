export const SLIP_MAX_EDGE = 1500;
export const SLIP_JPEG_QUALITY = 0.7;
export const SLIP_OUTPUT_FILENAME = 'slip.jpg';
export const SLIP_OUTPUT_TYPE = 'image/jpeg';

/** Max size after resize (typical output is ~80–250 KB). */
export const SLIP_MAX_BYTES = 400 * 1024;
export const SLIP_MAX_KB = SLIP_MAX_BYTES / 1024;

/** Large phone photos are OK before resize; they are compressed client-side. */
export const SLIP_INPUT_MAX_BYTES = 25 * 1024 * 1024;
export const SLIP_INPUT_MAX_MB = SLIP_INPUT_MAX_BYTES / (1024 * 1024);

export type SlipKind = 'session_payment' | 'cancellation_fee';

export function buildSlipStoragePath(userId: string, kind: SlipKind, key: string): string {
	return `${userId}/${kind}/${key}.jpg`;
}

export function validateSlipInput(file: File | null | undefined): string | null {
	if (!file) return 'Choose a bank slip image.';

	if (!file.type.startsWith('image/')) {
		return 'Bank slip must be an image file.';
	}

	if (file.size > SLIP_INPUT_MAX_BYTES) {
		return `Image must be ${SLIP_INPUT_MAX_MB} MB or smaller.`;
	}

	return null;
}

export function validateSlipFile(file: File | null | undefined): string | null {
	if (!file || file.size === 0) return 'Choose a bank slip image.';

	if (!file.type.startsWith('image/')) {
		return 'Bank slip must be an image file.';
	}

	if (file.size > SLIP_MAX_BYTES) {
		return `Processed slip must be ${SLIP_MAX_KB} KB or smaller. Please try again.`;
	}

	return null;
}

export async function compressSlipToFile(file: File): Promise<File> {
	const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	const scale = Math.min(1, SLIP_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
	const width = Math.max(1, Math.round(bitmap.width * scale));
	const height = Math.max(1, Math.round(bitmap.height * scale));

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext('2d');
	if (!ctx) {
		bitmap.close();
		throw new Error('Could not prepare slip image.');
	}

	ctx.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();

	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(result) => {
				if (result) resolve(result);
				else reject(new Error('Could not save slip image.'));
			},
			SLIP_OUTPUT_TYPE,
			SLIP_JPEG_QUALITY
		);
	});

	return new File([blob], SLIP_OUTPUT_FILENAME, { type: SLIP_OUTPUT_TYPE });
}
