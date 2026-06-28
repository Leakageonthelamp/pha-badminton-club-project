<script lang="ts">
	import { onMount } from 'svelte';
	import flatpickr from 'flatpickr';
	import type { Instance } from 'flatpickr/dist/types/instance';
	import 'flatpickr/dist/flatpickr.min.css';
	import { dateToLocalInput, localInputToDate } from '../datetime';

	let {
		id,
		label,
		value = $bindable(''),
		disabled = false,
		required = false,
		min,
		minNow = false,
		minOffsetMinutes = 0,
		placeholder = 'dd/mm/yyyy, --:--'
	}: {
		id: string;
		label: string;
		value?: string;
		disabled?: boolean;
		required?: boolean;
		min?: string;
		minNow?: boolean;
		minOffsetMinutes?: number;
		placeholder?: string;
	} = $props();

	let inputEl = $state<HTMLInputElement | null>(null);
	let picker = $state<Instance | null>(null);
	let isEditing = $state(false);
	const displayId = $derived(`${id}-display`);

	const resolveMinDate = (): Date | undefined => {
		const candidates: Date[] = [];
		if (minOffsetMinutes > 0) {
			candidates.push(new Date(Date.now() + minOffsetMinutes * 60_000));
		} else if (minNow) {
			candidates.push(new Date());
		}
		if (min) {
			const minDate = localInputToDate(min);
			if (minDate) candidates.push(minDate);
		}
		if (candidates.length === 0) return undefined;
		return new Date(Math.max(...candidates.map((date) => date.getTime())));
	};

	const syncAltInput = (instance: Instance) => {
		const alt = instance.altInput;
		if (!alt) return;

		alt.id = displayId;
		alt.placeholder = placeholder;
		alt.disabled = disabled;
		alt.classList.toggle('cursor-not-allowed', disabled);
		alt.classList.toggle('opacity-50', disabled);
		alt.required = required && !disabled;
	};

	const refreshMinDate = (instance: Instance) => {
		const minDate = resolveMinDate();
		instance.set('minDate', minDate ?? null);
		return minDate;
	};

	const clampToMinDate = (instance: Instance, triggerChange: boolean) => {
		const minDate = resolveMinDate();
		const selected = instance.selectedDates[0];
		if (!minDate || !selected || selected.getTime() >= minDate.getTime()) return;

		instance.setDate(minDate, triggerChange);
	};

	onMount(() => {
		if (!inputEl) return;

		picker = flatpickr(inputEl, {
			enableTime: true,
			time_24hr: true,
			clickOpens: true,
			allowInput: true,
			disableMobile: true,
			minuteIncrement: 1,
			dateFormat: 'Y-m-d H:i',
			altInput: true,
			altFormat: 'd/m/Y, H:i',
			altInputClass: 'datetime-picker-input',
			defaultDate: localInputToDate(value) ?? undefined,
			minDate: resolveMinDate(),
			onChange: (dates) => {
				value = dates[0] ? dateToLocalInput(dates[0]) : '';
			},
			onOpen: (_dates, _str, instance) => {
				refreshMinDate(instance);
			},
			onClose: (_dates, _str, instance) => {
				isEditing = false;
				refreshMinDate(instance);
				clampToMinDate(instance, true);
			},
			onReady: (_dates, _str, instance) => {
				syncAltInput(instance);
				const alt = instance.altInput;
				if (!alt) return;

				alt.addEventListener('focus', () => {
					isEditing = true;
				});
				alt.addEventListener('blur', () => {
					isEditing = false;
					refreshMinDate(instance);
					clampToMinDate(instance, true);
				});
			}
		});

		return () => {
			picker?.destroy();
			picker = null;
		};
	});

	$effect(() => {
		if (!picker || isEditing) return;

		refreshMinDate(picker);
		picker.set('clickOpens', !disabled);
		syncAltInput(picker);

		const externalDate = value ? localInputToDate(value) : null;
		const selected = picker.selectedDates[0];
		const externalMs = externalDate?.getTime() ?? null;
		const selectedMs = selected?.getTime() ?? null;

		if (externalMs !== selectedMs) {
			if (externalDate) picker.setDate(externalDate, false);
			else picker.clear(false);
		}
	});
</script>

<div>
	<label for={displayId} class="mb-2 block text-sm font-medium text-slate-700">{label}</label>
	<input bind:this={inputEl} {id} type="text" data-input class="hidden" />
</div>
