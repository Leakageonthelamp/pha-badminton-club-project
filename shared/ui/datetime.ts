/*
 * Device-timezone datetime helpers shared by both apps.
 *
 * Storage rule: timestamps are always stored/transferred as UTC ISO strings
 * (Postgres `timestamptz`). The DB is the single source of truth in UTC.
 *
 * Display rule: never hardcode a timezone. Format with the runtime default
 * timezone so each user sees times in their own device's local timezone.
 *
 * `<input type="datetime-local">` has no timezone, so the browser interprets
 * its value in the device's local timezone. Convert local input -> UTC on the
 * CLIENT (never the server, whose timezone differs from the device).
 */

/** Parse a date-only value (YYYY-MM-DD) in the device-local calendar. */
export const localDateToDate = (value: string): Date | null => {
	const trimmed = value.trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

	const [year, month, day] = trimmed.split('-').map(Number);
	if ([year, month, day].some((n) => Number.isNaN(n))) return null;

	const date = new Date(year, month - 1, day);
	return Number.isNaN(date.getTime()) ? null : date;
};

/** Build a date-only value (YYYY-MM-DD) from a Date in the device timezone. */
export const dateToLocalDate = (date: Date): string => {
	const pad = (value: number) => String(value).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** Parse a datetime-local value (device-local) to a Date. */
export const localInputToDate = (localValue: string): Date | null => {
	const trimmed = localValue.trim();
	if (!trimmed) return null;

	// Accept "YYYY-MM-DDTHH:mm" and flatpickr-style "YYYY-MM-DD HH:mm".
	const normalized = trimmed.replace(' ', 'T').slice(0, 16);
	const [datePart, timePart] = normalized.split('T');
	if (!datePart || !timePart) return null;

	const [year, month, day] = datePart.split('-').map(Number);
	const [hours, minutes] = timePart.split(':').map(Number);
	if ([year, month, day, hours, minutes].some((n) => Number.isNaN(n))) return null;

	const date = new Date(year, month - 1, day, hours, minutes);
	return Number.isNaN(date.getTime()) ? null : date;
};

/** Build a datetime-local value from a Date in the device timezone. */
export const dateToLocalInput = (date: Date): string => {
	const pad = (value: number) => String(value).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
		date.getHours()
	)}:${pad(date.getMinutes())}`;
};

/** Add hours to a datetime-local value; returns null if the input is invalid. */
export const addHoursToLocalInput = (localValue: string, hours: number): string | null => {
	const date = localInputToDate(localValue);
	if (!date) return null;

	return dateToLocalInput(new Date(date.getTime() + hours * 60 * 60 * 1000));
};

/** Convert a `datetime-local` value (device-local) to a UTC ISO string. */
export const localInputToUtc = (localValue: string): string => {
	const date = localInputToDate(localValue);
	if (!date) {
		throw new Error('Missing datetime value');
	}

	return date.toISOString();
};

/** Like `localInputToUtc` but returns '' instead of throwing (handy for derived form fields). */
export const localInputToUtcSafe = (localValue: string): string => {
	try {
		return localInputToUtc(localValue);
	} catch {
		return '';
	}
};

/** Convert a UTC ISO timestamp to a `datetime-local` value in the device timezone. */
export const utcToLocalInput = (utcISO: string): string => {
	const date = new Date(utcISO);
	if (Number.isNaN(date.getTime())) {
		return '';
	}

	const pad = (value: number) => String(value).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
		date.getHours()
	)}:${pad(date.getMinutes())}`;
};

/** Format a UTC ISO timestamp for display in the current device timezone. */
export const formatDateTime = (
	utcISO: string,
	options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short', hour12: false }
): string => new Intl.DateTimeFormat(undefined, options).format(new Date(utcISO));

/** Format only the date portion in the current device timezone. */
export const formatDate = (utcISO: string): string =>
	formatDateTime(utcISO, { dateStyle: 'medium' });

/** Format only the time portion in the current device timezone. */
export const formatTime = (utcISO: string): string =>
	formatDateTime(utcISO, { timeStyle: 'short', hour12: false });

/** Elapsed time since a UTC start timestamp (e.g. session uptime). Returns HH:mm:ss. */
export const formatUptime = (startAtUtc: string, nowMs: number = Date.now()): string => {
	const startMs = new Date(startAtUtc).getTime();
	if (Number.isNaN(startMs) || nowMs <= startMs) return '00:00:00';

	const totalSeconds = Math.floor((nowMs - startMs) / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const pad = (value: number) => String(value).padStart(2, '0');

	return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/** Minutes before `start_at` when the pre-start window opens (confirm/reject, cancel lock). */
export const SESSION_PRE_START_LEAD_MINUTES = 15;

/** True from T−lead through start (exclusive). */
export const isWithinPreStartWindow = (
	startAtUtc: string,
	leadMinutes: number = SESSION_PRE_START_LEAD_MINUTES,
	nowMs: number = Date.now()
): boolean => {
	const startMs = new Date(startAtUtc).getTime();
	if (Number.isNaN(startMs)) return false;

	const windowOpens = startMs - leadMinutes * 60 * 1000;
	return nowMs >= windowOpens && nowMs < startMs;
};

/** Remaining time until a UTC target. Returns mm:ss under 1 hour, else HH:mm:ss. */
export const formatCountdown = (targetAtUtc: string, nowMs: number = Date.now()): string => {
	const targetMs = new Date(targetAtUtc).getTime();
	if (Number.isNaN(targetMs) || nowMs >= targetMs) return '00:00';

	const totalSeconds = Math.floor((targetMs - nowMs) / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const pad = (value: number) => String(value).padStart(2, '0');

	if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
	return `${pad(minutes)}:${pad(seconds)}`;
};
