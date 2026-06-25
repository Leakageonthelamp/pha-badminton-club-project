import { looksLikePhone, normalizePhone } from '$lib/validation/identifier';

const escapeIlike = (value: string) => value.replace(/[%_,\\"]/g, '');

const ilikePattern = (query: string) => `%${escapeIlike(query)}%`;

/** PostgREST .or() filter for profile search by name, tag, email, or phone (E.164-aware). */
export const buildProfileSearchOrFilter = (query: string): string => {
	const trimmed = query.trim();
	const filters = [
		`display_name.ilike."${ilikePattern(trimmed)}"`,
		`tag.ilike."${ilikePattern(trimmed)}"`,
		`email.ilike."${ilikePattern(trimmed)}"`
	];

	const normalizedPhone = normalizePhone(trimmed);
	if (normalizedPhone) {
		filters.push(`phone.ilike."${ilikePattern(normalizedPhone)}"`);
	}

	if (looksLikePhone(trimmed)) {
		const digits = escapeIlike(trimmed.replace(/[\s-+]/g, '').replace(/^66/, '').replace(/^0/, ''));
		if (digits.length >= 2) {
			filters.push(`phone.ilike."%${digits}%"`);
		}
	}

	return filters.join(',');
};
