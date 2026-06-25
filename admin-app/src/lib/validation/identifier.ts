import { z } from 'zod';

export const isEmail = (value: string): boolean =>
	z.string().email().safeParse(value.trim().toLowerCase()).success;

/** ponytail: TH-only E.164 normalization; upgrade to libphonenumber for multi-country */
export const normalizePhone = (input: string): string | null => {
	const digits = input.replace(/[\s-]/g, '');

	if (/^0\d{9}$/.test(digits)) {
		return `+66${digits.slice(1)}`;
	}

	if (/^\+66\d{9}$/.test(digits)) {
		return digits;
	}

	if (/^66\d{9}$/.test(digits)) {
		return `+${digits}`;
	}

	return null;
};

export const looksLikePhone = (value: string): boolean => {
	const trimmed = value.trim();
	if (!trimmed || trimmed.includes('@')) {
		return false;
	}

	const digits = trimmed.replace(/[\s-]/g, '');
	return /^[\d+\s-]+$/.test(trimmed) && /^(\+|0|66)/.test(digits);
};

export type IdentifierKind = 'email' | 'phone' | 'unknown';

export const getIdentifierKind = (value: string): IdentifierKind => {
	const trimmed = value.trim();
	if (!trimmed) {
		return 'unknown';
	}

	if (trimmed.includes('@') || /[a-zA-Z]/.test(trimmed)) {
		return 'email';
	}

	if (looksLikePhone(trimmed) || /^[\d+\s-]+$/.test(trimmed)) {
		return 'phone';
	}

	return 'unknown';
};

export const validateIdentifier = (value: string): string | null => {
	const trimmed = value.trim();
	if (!trimmed) {
		return 'Enter your email or phone number';
	}

	const kind = getIdentifierKind(trimmed);

	if (kind === 'phone') {
		return normalizePhone(trimmed) ? null : 'Enter a valid Thai phone number (e.g. 0812345678)';
	}

	if (kind === 'email') {
		return isEmail(trimmed) ? null : 'Enter a valid email address';
	}

	return 'Enter a valid email or Thai phone number';
};
