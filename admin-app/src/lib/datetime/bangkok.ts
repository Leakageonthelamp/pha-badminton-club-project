const BANGKOK_TZ = 'Asia/Bangkok';

export const bangkokLocalToUtc = (localValue: string): string => {
	const trimmed = localValue.trim();
	if (!trimmed) {
		throw new Error('Missing datetime value');
	}

	const normalized = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
	return new Date(`${normalized}+07:00`).toISOString();
};

export const utcToBangkokLocalInput = (utcISO: string): string => {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-CA', {
			timeZone: BANGKOK_TZ,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		})
			.formatToParts(new Date(utcISO))
			.map((part) => [part.type, part.value])
	);

	return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

export const formatBangkok = (utcISO: string): string =>
	new Intl.DateTimeFormat('th-TH', {
		timeZone: BANGKOK_TZ,
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(new Date(utcISO));

export const formatBangkokWithZone = (utcISO: string): string =>
	`${formatBangkok(utcISO)} (Bangkok)`;
