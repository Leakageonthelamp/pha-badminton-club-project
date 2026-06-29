export const SESSION_JOIN_CLOSE_LEAD_MINUTES = 30;
/** Waiting-list players cannot self-cancel from this point until session end. */
export const SESSION_CANCEL_LOCK_LEAD_MINUTES = 15;

export const SESSION_IN_PROGRESS_JOIN_REMARK = `In progress · join until ${SESSION_JOIN_CLOSE_LEAD_MINUTES} min before end`;

export const isSessionJoinWindowOpen = (endAt: string, now = Date.now()): boolean =>
	now < new Date(endAt).getTime() - SESSION_JOIN_CLOSE_LEAD_MINUTES * 60 * 1000;
