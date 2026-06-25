import { describe, expect, it } from 'vitest';
import {
	AVATAR_INPUT_MAX_BYTES,
	AVATAR_MAX_BYTES,
	validateAvatarFile,
	validateAvatarInput
} from './avatar';

describe('validateAvatarInput', () => {
	it('requires a file', () => {
		expect(validateAvatarInput(null)).toBe('Choose an image.');
	});

	it('rejects non-images', () => {
		const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
		Object.defineProperty(file, 'size', { value: 100 });
		expect(validateAvatarInput(file)).toBe('Avatar must be an image file.');
	});

	it('allows large phone photos before crop', () => {
		const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
		Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 });
		expect(validateAvatarInput(file)).toBeNull();
	});

	it('rejects extremely large files', () => {
		const file = new File(['x'], 'huge.jpg', { type: 'image/jpeg' });
		Object.defineProperty(file, 'size', { value: AVATAR_INPUT_MAX_BYTES + 1 });
		expect(validateAvatarInput(file)).toContain('MB or smaller');
	});
});

describe('validateAvatarFile', () => {
	it('allows empty selection', () => {
		expect(validateAvatarFile(null)).toBeNull();
		expect(validateAvatarFile(new File([], 'empty'))).toBeNull();
	});

	it('rejects non-images', () => {
		const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
		Object.defineProperty(file, 'size', { value: 100 });
		expect(validateAvatarFile(file)).toBe('Avatar must be an image file.');
	});

	it('rejects processed files over the limit', () => {
		const file = new File(['x'], 'avatar.jpg', { type: 'image/jpeg' });
		Object.defineProperty(file, 'size', { value: AVATAR_MAX_BYTES + 1 });
		expect(validateAvatarFile(file)).toContain('KB or smaller');
	});

	it('accepts a cropped avatar', () => {
		const file = new File(['x'], 'avatar.jpg', { type: 'image/jpeg' });
		Object.defineProperty(file, 'size', { value: 48 * 1024 });
		expect(validateAvatarFile(file)).toBeNull();
	});
});
