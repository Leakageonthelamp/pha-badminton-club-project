import type { Instance } from 'flatpickr/dist/types/instance';

const pad2 = (value: number) => String(value).padStart(2, '0');

export const flatpickrHourSelectClass = 'flatpickr-hour-select';
export const flatpickrMinuteSelectClass = 'flatpickr-minute-select';

export const isSameLocalDay = (a: Date, b: Date): boolean =>
	a.getFullYear() === b.getFullYear() &&
	a.getMonth() === b.getMonth() &&
	a.getDate() === b.getDate();

const candidateDateTime = (selectedDay: Date, hour: number, minute: number): Date => {
	const candidate = new Date(selectedDay);
	candidate.setHours(hour, minute, 0, 0);
	return candidate;
};

export const isMinuteAllowed = (
	minute: number,
	selectedDay: Date,
	hour: number,
	minDate?: Date
): boolean => {
	if (!minDate || !isSameLocalDay(selectedDay, minDate)) return true;
	return candidateDateTime(selectedDay, hour, minute).getTime() >= minDate.getTime();
};

export const isHourAllowed = (hour: number, selectedDay: Date, minDate?: Date): boolean => {
	if (!minDate || !isSameLocalDay(selectedDay, minDate)) return true;
	for (let minute = 0; minute < 60; minute++) {
		if (isMinuteAllowed(minute, selectedDay, hour, minDate)) return true;
	}
	return false;
};

export const clampTimeToMinDate = (date: Date, minDate?: Date): Date => {
	if (!minDate || !isSameLocalDay(date, minDate)) return date;

	const candidate = candidateDateTime(date, date.getHours(), date.getMinutes());
	if (candidate.getTime() >= minDate.getTime()) return candidate;

	let bumped = candidateDateTime(date, minDate.getHours(), minDate.getMinutes());
	if (bumped.getTime() >= minDate.getTime()) return bumped;

	bumped.setMinutes(bumped.getMinutes() + 1);
	return bumped;
};

export const getFlatpickrTimeSelects = (
	instance: Instance
): { hour: HTMLSelectElement | null; minute: HTMLSelectElement | null } => ({
	hour: instance.timeContainer?.querySelector<HTMLSelectElement>(`.${flatpickrHourSelectClass}`) ?? null,
	minute:
		instance.timeContainer?.querySelector<HTMLSelectElement>(`.${flatpickrMinuteSelectClass}`) ?? null
});

const resolveTimeBase = (instance: Instance): Date | undefined =>
	instance.selectedDates[0] ?? instance.latestSelectedDateObj;

const setSelectOptionsDisabled = (
	select: HTMLSelectElement,
	isAllowed: (value: number) => boolean
): void => {
	for (const option of select.options) {
		const value = Number.parseInt(option.value, 10);
		option.disabled = Number.isNaN(value) || !isAllowed(value);
	}
};

const firstEnabledOptionValue = (select: HTMLSelectElement): string | null => {
	for (const option of select.options) {
		if (!option.disabled) return option.value;
	}
	return null;
};

const applyFlatpickrTimeSelects = (instance: Instance): void => {
	const { hour, minute } = getFlatpickrTimeSelects(instance);
	if (!hour || !minute || hour.disabled || minute.disabled) return;

	const hours = Number.parseInt(hour.value, 10);
	const minutes = Number.parseInt(minute.value, 10);
	if (Number.isNaN(hours) || Number.isNaN(minutes)) return;

	const base = resolveTimeBase(instance);
	if (!base) return;

	const next = new Date(base);
	next.setHours(hours, minutes, 0, 0);
	instance.setDate(next, false);
};

export const syncFlatpickrTimeSelects = (instance: Instance, minDate?: Date): void => {
	const { hour, minute } = getFlatpickrTimeSelects(instance);
	if (!hour || !minute) return;

	const base = resolveTimeBase(instance);
	if (!base) {
		hour.disabled = true;
		minute.disabled = true;
		return;
	}

	hour.disabled = false;
	minute.disabled = false;

	const clamped = clampTimeToMinDate(base, minDate);
	hour.value = String(clamped.getHours());
	minute.value = String(clamped.getMinutes());

	setSelectOptionsDisabled(hour, (value) => isHourAllowed(value, clamped, minDate));

	const selectedHour = Number.parseInt(hour.value, 10);
	setSelectOptionsDisabled(minute, (value) =>
		isMinuteAllowed(value, clamped, selectedHour, minDate)
	);

	const enabledHour = firstEnabledOptionValue(hour);
	if (enabledHour !== null && hour.selectedOptions[0]?.disabled) {
		hour.value = enabledHour;
	}

	const enabledMinute = firstEnabledOptionValue(minute);
	if (enabledMinute !== null && minute.selectedOptions[0]?.disabled) {
		minute.value = enabledMinute;
	}

	if (
		clamped.getHours() !== base.getHours() ||
		clamped.getMinutes() !== base.getMinutes() ||
		hour.value !== String(base.getHours()) ||
		minute.value !== String(base.getMinutes())
	) {
		applyFlatpickrTimeSelects(instance);
	}
};

const buildTimeSelect = (
	className: string,
	label: string,
	values: number[]
): HTMLSelectElement => {
	const select = document.createElement('select');
	select.className = `flatpickr-time-select ${className}`;
	select.setAttribute('aria-label', label);

	for (const value of values) {
		const option = document.createElement('option');
		option.value = String(value);
		option.textContent = pad2(value);
		select.appendChild(option);
	}

	return select;
};

/** Replace flatpickr's typed hour/minute spinners with dropdown selects. */
export const attachFlatpickrTimeSelects = (
	instance: Instance,
	getMinDate: () => Date | undefined = () => undefined
): void => {
	const timeContainer = instance.timeContainer;
	if (!timeContainer || timeContainer.dataset.timeSelectAttached === 'true') return;

	const minuteStep = Math.max(1, instance.config.minuteIncrement ?? 1);
	const minuteValues: number[] = [];
	for (let minute = 0; minute < 60; minute += minuteStep) {
		minuteValues.push(minute);
	}

	const hourSelect = buildTimeSelect(
		flatpickrHourSelectClass,
		'Hour',
		Array.from({ length: 24 }, (_, hour) => hour)
	);
	const minuteSelect = buildTimeSelect(flatpickrMinuteSelectClass, 'Minute', minuteValues);

	const row = document.createElement('div');
	row.className = 'flatpickr-time-select-row';

	const separator = document.createElement('span');
	separator.className = 'flatpickr-time-separator';
	separator.textContent = ':';
	separator.setAttribute('aria-hidden', 'true');

	row.append(hourSelect, separator, minuteSelect);

	for (const wrapper of timeContainer.querySelectorAll('.numInputWrapper')) {
		(wrapper as HTMLElement).hidden = true;
	}

	timeContainer.prepend(row);
	timeContainer.dataset.timeSelectAttached = 'true';

	const onTimeChange = () => {
		applyFlatpickrTimeSelects(instance);
		syncFlatpickrTimeSelects(instance, getMinDate());
	};

	hourSelect.addEventListener('change', onTimeChange);
	minuteSelect.addEventListener('change', onTimeChange);

	syncFlatpickrTimeSelects(instance, getMinDate());
};
