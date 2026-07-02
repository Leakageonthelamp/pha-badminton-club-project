import { t, tForLocale, type Locale } from './i18n/i18n.svelte';

export type PlayerActivity = 'idle' | 'playing' | 'break' | 'billing';

export type PlayerLiveStatus = 'idle' | 'playing' | 'break' | 'billing' | 'leave';

export const derivePlayerLiveStatus = ({
	membershipStatus,
	activity
}: {
	membershipStatus: string;
	activity: PlayerActivity;
}): PlayerLiveStatus => {
	if (membershipStatus === 'left') return 'leave';

	switch (activity) {
		case 'billing':
			return 'billing';
		case 'break':
			return 'break';
		case 'playing':
			return 'playing';
		default:
			return 'idle';
	}
};

export const playerLiveStatusLabel = (
	status: PlayerLiveStatus,
	courtNumber?: number | null,
	locale?: Locale
): string => {
	const tr = (key: string, params?: Record<string, string | number>) =>
		locale ? tForLocale(locale, key, params) : t(key, params);

	if (status === 'playing' && courtNumber != null) {
		return tr('status.playingOnCourt', { court: courtNumber });
	}

	switch (status) {
		case 'idle':
			return tr('status.idle');
		case 'playing':
			return tr('status.playing');
		case 'break':
			return tr('status.break');
		case 'billing':
			return tr('status.billing');
		case 'leave':
			return tr('status.leave');
	}
};

export const playerLiveStatusBadgeClass = (status: PlayerLiveStatus): string => {
	switch (status) {
		case 'idle':
			return 'bg-slate-100 text-slate-700 ring-slate-200';
		case 'playing':
			return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
		case 'break':
			return 'bg-amber-50 text-amber-800 ring-amber-100';
		case 'billing':
			return 'bg-sky-50 text-sky-700 ring-sky-100';
		case 'leave':
			return 'bg-slate-100 text-slate-500 ring-slate-200';
	}
};

/** ponytail: clamp to session start so pre-start idle_since never shows negative uptime */
export const clampIdleSince = (
	idleSince: string | null,
	sessionStartAt: string
): string | null => {
	if (!idleSince) return null;

	const idleMs = new Date(idleSince).getTime();
	const startMs = new Date(sessionStartAt).getTime();

	if (Number.isNaN(idleMs) || Number.isNaN(startMs)) return idleSince;

	return idleMs < startMs ? sessionStartAt : idleSince;
};

export const idleSinceSortKey = (idleSince: string | null, sessionStartAt: string): number => {
	const clamped = clampIdleSince(idleSince, sessionStartAt);
	if (!clamped) return Number.MAX_SAFE_INTEGER;

	return new Date(clamped).getTime();
};
