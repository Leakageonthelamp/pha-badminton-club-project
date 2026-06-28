<script lang="ts">
	import { onMount } from 'svelte';
	import flatpickr from 'flatpickr';
	import type { Instance } from 'flatpickr/dist/types/instance';
	import 'flatpickr/dist/flatpickr.min.css';
	import { dateToLocalInput, localInputToDate } from '@repo/ui/datetime';

	const inputClass =
		'datetime-picker-input w-full rounded-xl border border-slate-300 px-4 py-3 text-base placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 cursor-pointer';
	const labelClass = 'mb-2 block text-sm font-medium text-slate-700';

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
	const displayId = $derived(`${id}-display`);

	const resolveMinDate = (): Date | undefined => {
		const candidates: Date[] = [];
		if (minNow || minOffsetMinutes > 0) {
			candidates.push(new Date(Date.now() + minOffsetMinutes * 60 * 1000));
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
			altInputClass: inputClass,
			defaultDate: localInputToDate(value) ?? undefined,
			minDate: resolveMinDate(),
			onChange: (dates) => {
				value = dates[0] ? dateToLocalInput(dates[0]) : '';
			},
			onOpen: (_dates, _str, instance) => {
				if (minNow || minOffsetMinutes > 0) instance.set('minDate', resolveMinDate());
			},
			onReady: (_dates, _str, instance) => {
				syncAltInput(instance);
			}
		});

		return () => {
			picker?.destroy();
			picker = null;
		};
	});

	$effect(() => {
		if (!picker) return;

		picker.set('minDate', resolveMinDate());
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
	<label for={displayId} class={labelClass}>{label}</label>
	<input bind:this={inputEl} {id} type="text" data-input />
</div>

<style>
	:global(.flatpickr-calendar) {
		border-radius: 1rem;
		border: 1px solid rgb(226 232 240);
		box-shadow:
			0 10px 15px -3px rgb(0 0 0 / 0.1),
			0 4px 6px -4px rgb(0 0 0 / 0.1);
		font-family: inherit;
	}

	:global(.flatpickr-months .flatpickr-month),
	:global(.flatpickr-current-month .flatpickr-monthDropdown-months),
	:global(.flatpickr-weekdays),
	:global(span.flatpickr-weekday) {
		background: white;
	}

	:global(.flatpickr-day.selected),
	:global(.flatpickr-day.startRange),
	:global(.flatpickr-day.endRange),
	:global(.flatpickr-day.selected:hover),
	:global(.flatpickr-day.startRange:hover),
	:global(.flatpickr-day.endRange:hover) {
		background: var(--color-brand-600);
		border-color: var(--color-brand-600);
	}

	:global(.flatpickr-day.today) {
		border-color: var(--color-brand-600);
	}

	:global(.flatpickr-day:hover),
	:global(.flatpickr-day:focus) {
		background: rgb(244 236 249);
		border-color: rgb(244 236 249);
	}

	:global(.flatpickr-time input:hover),
	:global(.flatpickr-time input:focus) {
		background: rgb(244 236 249);
	}

	:global(.flatpickr-months .flatpickr-prev-month:hover svg),
	:global(.flatpickr-months .flatpickr-next-month:hover svg) {
		fill: var(--color-brand-600);
	}
</style>
