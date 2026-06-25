export const AVATAR_OUTPUT_SIZE = 512;
export const AVATAR_JPEG_QUALITY = 0.85;
export const AVATAR_OUTPUT_FILENAME = 'avatar.jpg';
export const AVATAR_OUTPUT_TYPE = 'image/jpeg';

/** Max size after crop + resize (typical output is ~30–80 KB). */
export const AVATAR_MAX_BYTES = 512 * 1024;
export const AVATAR_MAX_KB = AVATAR_MAX_BYTES / 1024;

/** Large phone photos are OK before crop; they are resized client-side. */
export const AVATAR_INPUT_MAX_BYTES = 25 * 1024 * 1024;
export const AVATAR_INPUT_MAX_MB = AVATAR_INPUT_MAX_BYTES / (1024 * 1024);

export type CropArea = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export function validateAvatarInput(file: File | null | undefined): string | null {
	if (!file) return 'Choose an image.';

	if (!file.type.startsWith('image/')) {
		return 'Avatar must be an image file.';
	}

	if (file.size > AVATAR_INPUT_MAX_BYTES) {
		return `Image must be ${AVATAR_INPUT_MAX_MB} MB or smaller.`;
	}

	return null;
}

export function validateAvatarFile(file: File | null | undefined): string | null {
	if (!file || file.size === 0) return null;

	if (!file.type.startsWith('image/')) {
		return 'Avatar must be an image file.';
	}

	if (file.size > AVATAR_MAX_BYTES) {
		return `Processed avatar must be ${AVATAR_MAX_KB} KB or smaller. Please try again.`;
	}

	return null;
}

/** Normalize EXIF orientation so the cropper matches what the user sees. */
export async function normalizeImageForCrop(file: File): Promise<string> {
	const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	const canvas = document.createElement('canvas');
	canvas.width = bitmap.width;
	canvas.height = bitmap.height;

	const ctx = canvas.getContext('2d');
	if (!ctx) {
		bitmap.close();
		throw new Error('Could not prepare image for cropping.');
	}

	ctx.drawImage(bitmap, 0, 0);
	bitmap.close();

	return canvas.toDataURL(AVATAR_OUTPUT_TYPE, AVATAR_JPEG_QUALITY);
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error('Could not load image.'));
		image.src = src;
	});
}

export async function cropAvatarToFile(
	imageSrc: string,
	crop: CropArea,
	outputSize = AVATAR_OUTPUT_SIZE
): Promise<File> {
	const image = await loadImage(imageSrc);
	const canvas = document.createElement('canvas');
	canvas.width = outputSize;
	canvas.height = outputSize;

	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('Could not crop image.');
	}

	ctx.drawImage(
		image,
		crop.x,
		crop.y,
		crop.width,
		crop.height,
		0,
		0,
		outputSize,
		outputSize
	);

	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(result) => {
				if (result) resolve(result);
				else reject(new Error('Could not save cropped image.'));
			},
			AVATAR_OUTPUT_TYPE,
			AVATAR_JPEG_QUALITY
		);
	});

	return new File([blob], AVATAR_OUTPUT_FILENAME, { type: AVATAR_OUTPUT_TYPE });
}
