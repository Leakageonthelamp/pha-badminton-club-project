export type CourtShareInput = {
	courtFeePerHour: number;
	startAt: string;
	endAt: string;
	courtCount: number;
	activePlayers: number;
	/** When set, every player pays this flat fee instead of an even split of the court cost. */
	fixedCourtFeePerPlayer?: number | null;
};

export type CourtTotalInput = Omit<CourtShareInput, 'activePlayers' | 'fixedCourtFeePerPlayer'>;

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Full session court cost before splitting across players. */
export const computeCourtTotal = ({
	courtFeePerHour,
	startAt,
	endAt,
	courtCount
}: CourtTotalInput): number => {
	const startMs = new Date(startAt).getTime();
	const endMs = new Date(endAt).getTime();
	if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return 0;

	const durationHours = (endMs - startMs) / (1000 * 60 * 60);
	return Math.round(courtFeePerHour * durationHours * courtCount * 100) / 100;
};

/**
 * Per-player court charge. Flat `fixedCourtFeePerPlayer` when the session sets one;
 * otherwise an even split of the full session court cost across active players (confirmed + left).
 */
export const computeCourtShare = ({
	courtFeePerHour,
	startAt,
	endAt,
	courtCount,
	activePlayers,
	fixedCourtFeePerPlayer = null
}: CourtShareInput): number => {
	if (fixedCourtFeePerPlayer != null) return round2(fixedCourtFeePerPlayer);
	if (activePlayers <= 0) return 0;

	const courtTotal = computeCourtTotal({ courtFeePerHour, startAt, endAt, courtCount });
	return round2(courtTotal / activePlayers);
};

/** Whether the session bills a flat court fee instead of splitting actual cost. */
export const hasFixedCourtFee = (fixedCourtFeePerPlayer: number | null | undefined): boolean =>
	fixedCourtFeePerPlayer != null;

/** Short mode label for per-player court fee UI. */
export const courtFeePerPlayerModeLabel = (
	fixedCourtFeePerPlayer: number | null | undefined
): 'Fixed fee' | 'Shared cost' =>
	hasFixedCourtFee(fixedCourtFeePerPlayer) ? 'Fixed fee' : 'Shared cost';

/** Lowercase noun phrase for inline copy (e.g. modal parentheticals). */
export const courtFeePerPlayerModeNoun = (
	fixedCourtFeePerPlayer: number | null | undefined
): 'fixed court fee' | 'shared court cost' =>
	hasFixedCourtFee(fixedCourtFeePerPlayer) ? 'fixed court fee' : 'shared court cost';

/** Hint under per-player court fee amounts. Pass activePlayers for shared-cost split detail. */
export const courtFeePerPlayerModeHint = (
	fixedCourtFeePerPlayer: number | null | undefined,
	activePlayers?: number | null
): string => {
	if (hasFixedCourtFee(fixedCourtFeePerPlayer)) {
		return 'Fixed fee — same amount for every player';
	}
	if (activePlayers != null && activePlayers > 0) {
		return `Shared cost — split across ${activePlayers} active player${activePlayers === 1 ? '' : 's'}`;
	}
	return 'Shared cost — split evenly among active players';
};

export type SessionProfitInput = {
	fixedCourtFeePerPlayer: number | null;
	courtFeePerHour: number;
	startAt: string;
	endAt: string;
	courtCount: number;
	/** Players billed the court fee: confirmed + left (attended). */
	billedPlayers: number;
	/** Shuttles consumed across completed matches. */
	shuttlesUsed: number;
	/** Price charged to players per shuttle. */
	shuttlePricePerEach: number;
	/** Club's real cost per shuttle (snapshotted on the session). */
	shuttleCostPerEach: number;
};

export type SessionProfit = {
	courtCost: number;
	courtRevenue: number;
	courtProfit: number;
	shuttleCost: number;
	shuttleRevenue: number;
	shuttleProfit: number;
	totalProfit: number;
};

/**
 * Session profit = court profit + shuttle profit.
 * Court profit is 0 in cost-sharing mode (no fixed fee: revenue == cost). With a fixed fee,
 * court revenue = fixedCourtFeePerPlayer × billedPlayers. Shuttle profit = markup × shuttles used.
 */
export const computeSessionProfit = ({
	fixedCourtFeePerPlayer,
	courtFeePerHour,
	startAt,
	endAt,
	courtCount,
	billedPlayers,
	shuttlesUsed,
	shuttlePricePerEach,
	shuttleCostPerEach
}: SessionProfitInput): SessionProfit => {
	const courtCost = computeCourtTotal({ courtFeePerHour, startAt, endAt, courtCount });
	const courtRevenue =
		fixedCourtFeePerPlayer != null
			? round2(fixedCourtFeePerPlayer * Math.max(billedPlayers, 0))
			: courtCost;
	const courtProfit = round2(courtRevenue - courtCost);

	const shuttleRevenue = round2(Math.max(shuttlesUsed, 0) * shuttlePricePerEach);
	const shuttleCost = round2(Math.max(shuttlesUsed, 0) * shuttleCostPerEach);
	const shuttleProfit = round2(shuttleRevenue - shuttleCost);

	return {
		courtCost,
		courtRevenue,
		courtProfit,
		shuttleCost,
		shuttleRevenue,
		shuttleProfit,
		totalProfit: round2(courtProfit + shuttleProfit)
	};
};

/** Player shuttle share: even 4-way split per match, summed. Mirrors DB compute_session_player_shuttle_share. */
export const computePlayerShuttleShare = (
	shuttlesUsedTotal: number,
	pricePerShuttle: number
): number => {
	if (shuttlesUsedTotal <= 0 || pricePerShuttle <= 0) return 0;
	// ponytail: ÷4 matches doubles-only DB rule; singles would need per-match player count
	return Math.round(((shuttlesUsedTotal * pricePerShuttle) / 4) * 100) / 100;
};

/** Inverse of computePlayerShuttleShare — shuttles implied by a billed shuttle share. */
export const deriveShuttlesFromShare = (
	shuttleShare: number,
	pricePerShuttle: number
): number => {
	if (shuttleShare <= 0 || pricePerShuttle <= 0) return 0;
	return Math.round((shuttleShare * 4) / pricePerShuttle);
};

export const formatThb = (amount: number): string =>
	new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);

export type PaymentStatus = 'pending' | 'submitted' | 'approved';

export const paymentStatusLabel = (status: PaymentStatus): string => {
	switch (status) {
		case 'pending':
			return 'Pending payment';
		case 'submitted':
			return 'Awaiting confirmation';
		case 'approved':
			return 'Paid';
	}
};

export type CancellationFeeStatus = 'none' | 'owed' | 'submitted' | 'paid' | 'waived';

export const isOutstandingCancellationFee = (
	feeOwed: number,
	feeStatus: CancellationFeeStatus
): boolean => feeOwed > 0 && (feeStatus === 'owed' || feeStatus === 'submitted');

export const cancellationFeeStatusLabel = (status: CancellationFeeStatus): string => {
	switch (status) {
		case 'none':
			return 'No fee';
		case 'owed':
			return 'Payment due';
		case 'submitted':
			return 'Awaiting confirmation';
		case 'paid':
			return 'Paid';
		case 'waived':
			return 'Waived';
	}
};

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export const leaveRequestStatusLabel = (status: LeaveRequestStatus): string => {
	switch (status) {
		case 'pending':
			return 'Pending approval';
		case 'approved':
			return 'Approved';
		case 'rejected':
			return 'Rejected';
		case 'cancelled':
			return 'Cancelled';
	}
};
