import { describe, expect, it } from 'vitest';
import { readFlatpickrPendingDate } from './flatpickrSelection';
import type { Instance } from 'flatpickr/dist/types/instance';

const mockInstance = (overrides: Partial<Instance>): Instance =>
	({
		config: { altFormat: 'd/m/Y, H:i' },
		selectedDates: [],
		parseDate: (value: string, format?: string) => {
			if (format !== 'd/m/Y, H:i') return undefined;
			const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4}), (\d{1,2}):(\d{2})$/.exec(value);
			if (!match) return undefined;
			const [, day, month, year, hour, minute] = match;
			return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
		},
		...overrides
	}) as Instance;

describe('readFlatpickrPendingDate', () => {
	it('parses typed alt input before selectedDates', () => {
		const selected = readFlatpickrPendingDate(
			mockInstance({
				altInput: { value: '30/06/2026, 14:31' } as HTMLInputElement,
				selectedDates: [new Date(2026, 5, 29, 9, 0)]
			}),
			{ withTime: true }
		);

		expect(selected?.getFullYear()).toBe(2026);
		expect(selected?.getMonth()).toBe(5);
		expect(selected?.getDate()).toBe(30);
		expect(selected?.getHours()).toBe(14);
		expect(selected?.getMinutes()).toBe(31);
	});

	it('applies hour and minute dropdown values to the selected day', () => {
		const hourSelect = { value: '14' } as HTMLSelectElement;
		const minuteSelect = { value: '31' } as HTMLSelectElement;
		const timeContainer = {
			querySelector: (selector: string) => {
				if (selector.includes('hour')) return hourSelect;
				if (selector.includes('minute')) return minuteSelect;
				return null;
			}
		} as HTMLDivElement;

		const selected = readFlatpickrPendingDate(
			mockInstance({
				altInput: { value: '' } as HTMLInputElement,
				selectedDates: [new Date(2026, 5, 30, 9, 0)],
				timeContainer
			}),
			{ withTime: true }
		);

		expect(selected?.getDate()).toBe(30);
		expect(selected?.getHours()).toBe(14);
		expect(selected?.getMinutes()).toBe(31);
	});
});
