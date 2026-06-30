import type { Instance } from 'flatpickr/dist/types/instance';
import { getFlatpickrTimeSelects } from './flatpickrTimeSelects';

/** Read the datetime the user sees (typed alt input, calendar day, time selects). */
export const readFlatpickrPendingDate = (
	instance: Instance,
	options: { withTime?: boolean } = {}
): Date | undefined => {
	const altValue = instance.altInput?.value.trim();
	if (altValue) {
		const parsed = instance.parseDate(altValue, instance.config.altFormat);
		if (parsed) return parsed;
	}

	const base = instance.selectedDates[0] ?? instance.latestSelectedDateObj;
	if (!base) return undefined;

	if (options.withTime) {
		const { hour: hourSelect, minute: minuteSelect } = getFlatpickrTimeSelects(instance);
		if (hourSelect && minuteSelect) {
			const hours = Number.parseInt(hourSelect.value, 10);
			const minutes = Number.parseInt(minuteSelect.value, 10);
			if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
				const synced = new Date(base);
				synced.setHours(hours, minutes, 0, 0);
				return synced;
			}
		}

		if (instance.hourElement && instance.minuteElement) {
			const hours = Number.parseInt(instance.hourElement.value, 10);
			const minutes = Number.parseInt(instance.minuteElement.value, 10);
			if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
				const synced = new Date(base);
				synced.setHours(hours, minutes, 0, 0);
				return synced;
			}
		}
	}

	return base;
};
