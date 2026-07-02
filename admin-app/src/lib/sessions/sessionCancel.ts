import type { Locale } from '$lib/i18n';
import { tForLocale } from '$lib/i18n';
import { DEFAULT_LOCALE } from '@repo/ui/i18n';
import type { SessionCancelSource, SessionStatus } from '$lib/types/session';

export const sessionCancelSourceLabel = (
	source: SessionCancelSource,
	locale?: Locale
): string => {
	const loc = locale ?? DEFAULT_LOCALE;
	switch (source) {
		case 'club_admin':
			return tForLocale(loc, 'session.cancelSource.clubAdmin');
		case 'super_admin':
			return tForLocale(loc, 'session.cancelSource.superAdmin');
		case 'system':
			return tForLocale(loc, 'session.cancelSource.system');
	}
};

export type SessionCancelDisplayInput = {
	status: SessionStatus;
	cancel_source: SessionCancelSource | null;
	cancel_reason: string | null;
	cancelled_by_name?: string | null;
};

export const sessionCancelDetail = (
	session: SessionCancelDisplayInput,
	locale?: Locale
): string | null => {
	const loc = locale ?? DEFAULT_LOCALE;
	if (session.status !== 'cancelled') return null;

	const reason = session.cancel_reason?.trim();
	if (!reason && !session.cancel_source) return tForLocale(loc, 'session.cancelled.default');

	const sourceLabel = session.cancel_source
		? sessionCancelSourceLabel(session.cancel_source, loc)
		: null;
	const byName =
		session.cancelled_by_name && session.cancel_source !== 'system'
			? ` (${session.cancelled_by_name})`
			: '';

	if (sourceLabel && reason) return `${sourceLabel}${byName} · ${reason}`;
	if (sourceLabel) return `${sourceLabel}${byName}`;
	return reason ?? tForLocale(loc, 'session.cancelled.default');
};
