/** Shared UI strings (English). Keys must match shared.th.ts. */
export const sharedEn: Record<string, string> = {
	// Nav & locale
	'nav.language': 'Language',
	'nav.languageAria': 'Change language ({language})',
	'nav.closeLanguageMenu': 'Close language menu',
	'nav.goBack': 'Go back',
	'nav.goHome': 'Go home',

	// Theme
	'theme.label': 'Theme',
	'theme.light': 'Light',
	'theme.dark': 'Dark',
	'theme.system': 'System',

	// Profile menu
	'profile.menu': 'Account menu',
	'profile.closeMenu': 'Close account menu',
	'profile.profile': 'Profile',
	'profile.logOut': 'Log out',

	// Pagination
	'pagination.label': 'Pagination',
	'pagination.prev': '← Prev',
	'pagination.next': 'Next →',
	'pagination.prevAria': 'Previous page',
	'pagination.nextAria': 'Next page',
	'pagination.pageOf': 'Page {page} of {total}',

	// Common actions
	'common.close': 'Close',
	'common.closeDialog': 'Close dialog',
	'common.dismiss': 'Dismiss',
	'common.save': 'Save',
	'common.cancel': 'Cancel',
	'common.confirm': 'Confirm',
	'common.delete': 'Delete',
	'common.edit': 'Edit',
	'common.search': 'Search',
	'common.loading': 'Loading…',
	'common.notSet': 'Not set',
	'common.noDescription': 'No description.',
	'common.teamA': 'Team A',
	'common.teamB': 'Team B',
	'common.vs': 'vs',
	'common.you': 'You',
	'common.opp': 'Opp',
	'common.win': 'Win',
	'common.loss': 'Loss',
	'common.draw': 'Draw',
	'common.court': 'Court {number}',

	// Player live status
	'status.idle': 'Idle',
	'status.playing': 'Playing',
	'status.playingOnCourt': 'Playing on court {court}',
	'status.break': 'Break',
	'status.billing': 'Billing',
	'status.leave': 'Leave',

	// Payments
	'payment.fixedFee': 'Fixed fee',
	'payment.sharedCost': 'Shared cost',
	'payment.fixedCourtFee': 'fixed court fee',
	'payment.sharedCourtCost': 'shared court cost',
	'payment.fixedFeeHint': 'Fixed fee — same amount for every player',
	'payment.sharedCostHintPlayers':
		'Shared cost — split across {count} active player{plural}',
	'payment.sharedCostHint': 'Shared cost — split evenly among active players',
	'payment.pending': 'Pending payment',
	'payment.awaitingConfirmation': 'Awaiting confirmation',
	'payment.paid': 'Paid',
	'payment.noFee': 'No fee',
	'payment.paymentDue': 'Payment due',
	'payment.waived': 'Waived',
	'payment.leavePending': 'Pending approval',
	'payment.leaveApproved': 'Approved',
	'payment.leaveRejected': 'Rejected',
	'payment.leaveCancelled': 'Cancelled',

	// Transactions
	'transaction.allStatuses': 'All statuses',
	'transaction.allTypes': 'All types',
	'transaction.sessionFee': 'Session fee',
	'transaction.cancellationFee': 'Cancellation fee',

	// Matches
	'match.inviting': 'Inviting',
	'match.playing': 'Playing',
	'match.confirmingScore': 'Confirming score',
	'match.suspended': 'Suspended',
	'match.completed': 'Completed',
	'match.cancelled': 'Cancelled',
	'match.submitted': 'Submitted',
	'match.accepted': 'Accepted',
	'match.rejected': 'Rejected',
	'match.waiting': 'Waiting',
	'match.courtIdle': 'Idle',
	'match.record': '{wins}W · {losses}L · {draws}D',
	'match.rallyScoreHint':
		'First to {target} wins if the other team is below {deuceLine}. At {deuceLine}-{deuceLine}, play continues until one team leads by 2 (e.g. {exampleWin}-{exampleLose}).',
	'match.enterBothScores': 'Enter both scores',
	'match.scoresNegative': 'Scores cannot be negative',
	'match.gameTied': 'Game cannot be tied',
	'match.invalidScore': 'Invalid {scoreType}-point game score',
	'match.enterGameScores': 'Enter {count} game score{plural}',
	'match.gameError': 'Game {gameNo}: {error}',
	'match.noMatchOnCourt': 'No match on this court.',
	'match.matchSuspended': 'Match suspended — resolve on the match page.',
	'match.scoreRejectedReview': 'Score was rejected — review and enter the final result.',

	// Court detail
	'court.detail': 'Court detail',
	'court.details': 'Court details',
	'court.playersOnCourt': 'Players on court',
	'court.players': 'Players',

	// Location
	'location.requiredTitle': 'Location is required',
	'location.requiredBody':
		'Allow location access so we can show nearby clubs and help you set venues on the map.',
	'location.locating': 'Locating…',
	'location.useCurrentLocation': 'Use current location',
	'location.tryAgain': 'Try again',
	'location.deniedBody':
		'This app needs your location to work properly. Enable it in your browser or device settings, then tap below.',
	'location.offTitle': 'Location access is turned off',
	'location.offBody':
		'Enable location in your browser settings to see nearby clubs and sessions sorted by distance.',
	'location.unavailableTitle': 'Location not available',
	'location.unavailableBody': 'We could not detect your location. You can still browse all clubs and sessions.',
	'location.enable': 'Enable location',
	'location.notNow': 'Not now',

	// Samsung notice
	'samsung.title': 'Samsung Internet dark mode',
	'samsung.body':
		'This app looks best in light mode. Turn off Samsung Internet’s dark mode for this site in Settings → Labs → Use website dark mode.',
	'samsung.dismiss': 'Got it',

	// Slip preview
	'slip.preview': 'Preview slip',
	'slip.title': 'Bank transfer slip',
	'slip.loading': 'Loading slip…',
	'slip.alt': 'Bank transfer slip',
	'slip.missing': 'Slip image unavailable',
	'slip.missingHint': 'The uploaded file may have been removed or is no longer accessible.',
	'slip.unavailable': 'Slip image unavailable (it may have been removed from storage).',

	// Match score fields
	'score.teamA': 'Team A score',
	'score.teamB': 'Team B score',
	'score.game': 'Game {number}',
	'score.yourTeam': 'Your team',
	'score.yourTeamHint': "Your team is highlighted — enter your team's score on that side.",
	'score.yourTeamScoreGame': 'Your team score game {number}',
	'score.teamAScoreGame': 'Team A score game {number}',
	'score.teamBScoreGame': 'Team B score game {number}',

	// Rich text
	'richText.empty': 'No description.',

	// Submit button
	'submit.saving': 'Saving…',

	// Session timers
	'session.startsInLabel': 'Starts in',
	'session.startsIn': 'Starts in {time}',
	'session.started': 'Started',
	'session.ended': 'Ended',
	'session.uptimeLabel': 'Uptime',
	'session.timeLeft': 'Time left',
	'session.remaining': '{time} left',
	'session.overdue': 'Overdue',
	'session.duration': '{duration}',
	'session.uptime': 'Up {time}',

	// Sign-in method labels (shared)
	'signIn.google': 'Google',
	'signIn.facebook': 'Facebook',
	'signIn.phone': 'Phone',
	'signIn.email': 'Email'
};
