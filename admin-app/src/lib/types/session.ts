import type { Locale } from '$lib/i18n';
import { tForLocale } from '$lib/i18n';
import { DEFAULT_LOCALE } from '@repo/ui/i18n';
import type { PromptPayType } from '$lib/types/club';
import type { CancellationFeeStatus } from '@repo/ui/payments';
import type { PlayerActivity } from '@repo/ui/sessionStatus';

export type SessionStatus = 'draft' | 'open' | 'in_progress' | 'closed' | 'cancelled';
export type SessionCancelSource = 'club_admin' | 'super_admin' | 'system';
export type MatchScoreType = 15 | 21;
export type MatchType = 'one_round' | 'two_round';

export type Session = {
	id: string;
	club_id: string;
	host_id: string;
	name: string;
	description: string;
	status: SessionStatus;
	start_at: string;
	end_at: string;
	finished_at: string | null;
	ended_early: boolean;
	settlement_started_at: string | null;
	venue_name: string | null;
	latitude: number | null;
	longitude: number | null;
	max_players: number;
	min_players: number;
	court_count: number;
	court_fee_per_hour: number;
	fixed_court_fee_per_player: number | null;
	shuttle_id: string | null;
	shuttle_price_per_each: number;
	shuttle_cost_per_each: number;
	match_score_type: MatchScoreType;
	match_type: MatchType;
	cancellation_fee: number;
	max_buffer: number;
	promptpay_type: PromptPayType | null;
	promptpay_target: string | null;
	cancel_source: SessionCancelSource | null;
	cancel_reason: string | null;
	cancelled_by: string | null;
	created_at: string;
	updated_at: string;
};

export type SessionCancelledByProfile = {
	id: string;
	display_name: string;
};

export type SessionHostProfile = {
	id: string;
	display_name: string;
	tag: string;
};

export type SessionClubSummary = {
	id: string;
	name: string;
};

export type SessionShuttleSummary = {
	id: string;
	name: string;
	speed: 75 | 76;
	price: number;
	number_per_box: number;
};

export type SessionListItem = Session & {
	club: SessionClubSummary | null;
	host: SessionHostProfile | null;
};

export type SessionDetail = Session & {
	club: SessionClubSummary | null;
	host: SessionHostProfile | null;
	shuttle: SessionShuttleSummary | null;
	cancelled_by_profile: SessionCancelledByProfile | null;
};

export const sessionStatusLabel = (status: SessionStatus, locale?: Locale): string => {
	const loc = locale ?? DEFAULT_LOCALE;
	switch (status) {
		case 'draft':
			return tForLocale(loc, 'session.status.draft');
		case 'open':
			return tForLocale(loc, 'session.status.open');
		case 'in_progress':
			return tForLocale(loc, 'session.status.inProgress');
		case 'closed':
			return tForLocale(loc, 'session.status.closed');
		case 'cancelled':
			return tForLocale(loc, 'session.status.cancelled');
	}
};

export const matchTypeLabel = (matchType: MatchType, locale?: Locale): string =>
	matchType === 'one_round'
		? tForLocale(locale ?? DEFAULT_LOCALE, 'session.matchType.oneRound')
		: tForLocale(locale ?? DEFAULT_LOCALE, 'session.matchType.twoRounds');

export const sessionStatusBadgeClass = (status: SessionStatus): string => {
	switch (status) {
		case 'draft':
			return 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300';
		case 'open':
			return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
		case 'in_progress':
			return 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300';
		case 'closed':
			return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
		case 'cancelled':
			return 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300';
	}
};

/** Hero banner modifier for session detail (dark gradient background). */
export const sessionStatusHeroClass = (status: SessionStatus): string => {
	switch (status) {
		case 'draft':
			return 'app-hero-status--draft';
		case 'open':
			return 'app-hero-status--open';
		case 'in_progress':
			return 'app-hero-status--live';
		case 'closed':
			return 'app-hero-status--closed';
		case 'cancelled':
			return 'app-hero-status--cancelled';
	}
};

export const sessionStatusShowsLiveDot = (status: SessionStatus): boolean =>
	status === 'open' || status === 'in_progress';

export type SessionPlayerStatus =
	| 'waiting'
	| 'queued'
	| 'confirmed'
	| 'rejected'
	| 'cancelled'
	| 'left';

export type SessionPlayerProfile = {
	id: string;
	display_name: string;
	tag: string;
	avatar_url: string | null;
};

export type SessionPlayer = {
	id: string;
	session_id: string;
	user_id: string;
	status: SessionPlayerStatus;
	fee_owed: number;
	fee_status: CancellationFeeStatus;
	fee_slip_path: string | null;
	fee_paid_at: string | null;
	joined_at: string;
	decided_at: string | null;
	left_at: string | null;
	activity: PlayerActivity;
	idle_since: string | null;
	created_at: string;
	updated_at: string;
};

export type SessionPlayerWithProfile = SessionPlayer & {
	profile: SessionPlayerProfile | null;
};

export const sessionPlayerStatusLabel = (status: SessionPlayerStatus, locale?: Locale): string => {
	const loc = locale ?? DEFAULT_LOCALE;
	switch (status) {
		case 'waiting':
			return tForLocale(loc, 'session.playerStatus.waiting');
		case 'queued':
			return tForLocale(loc, 'session.playerStatus.queued');
		case 'confirmed':
			return tForLocale(loc, 'session.playerStatus.confirmed');
		case 'rejected':
			return tForLocale(loc, 'session.playerStatus.rejected');
		case 'cancelled':
			return tForLocale(loc, 'session.playerStatus.cancelled');
		case 'left':
			return tForLocale(loc, 'session.playerStatus.left');
	}
};
