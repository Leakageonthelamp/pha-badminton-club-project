import { env } from '$env/dynamic/private';

const DEFAULT_MAX_ACTIVE_SESSIONS = 50;
const DEFAULT_MAX_ADMINS = 20;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
	const parsed = Number.parseInt(raw ?? '', 10);
	return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
}

export const CLUB_MAX_ACTIVE_SESSIONS_LIMIT = parsePositiveInt(
	env.CLUB_MAX_ACTIVE_SESSIONS_LIMIT,
	DEFAULT_MAX_ACTIVE_SESSIONS
);

export const CLUB_MAX_ADMINS_LIMIT = parsePositiveInt(env.CLUB_MAX_ADMINS_LIMIT, DEFAULT_MAX_ADMINS);
