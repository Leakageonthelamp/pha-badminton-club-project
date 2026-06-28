<script lang="ts">
	import { onMount } from 'svelte';
	import flatpickr from 'flatpickr';
	import type { Instance } from 'flatpickr/dist/types/instance';
	import 'flatpickr/dist/flatpickr.min.css';
	import { dateToLocalDate, localDateToDate } from '../datetime';

	let {
		id,
		label,
		value = $bindable(''),
		disabled = false,
		required = false,
		variant = 'default',
		placeholder = 'dd/mm/yyyy'
	}: {
		id: string;
		label: string;
		value?: string;
		disabled?: boolean;
		required?: boolean;
		variant?: 'default' | 'filter';
		placeholder?: string;
	} = $props();

	let inputEl = $state<HTMLInputElement | null>(null);
	let picker = $state<Instance | null>(null);
	let isEditing = $state(false);
	const displayId = $derived(`${id}-display`);
	const labelId = $derived(`${id}-label`);
	const labelClass = $derived(variant === 'filter' ? 'app-filter-label' : 'mb-2 block text-sm font-medium text-slate-700');

	const syncAltInput = (instance: Instance) => {
		const alt = instance.altInput;
		if (!alt) return;

		alt.id = displayId;
		alt.setAttribute('aria-labelledby', labelId);
		alt.placeholder = placeholder;
		alt.disabled = disabled;
		alt.autocomplete = 'off';
		alt.setAttribute('autocomplete', 'off');
		alt.setAttribute('autocorrect', 'off');
		alt.setAttribute('autocapitalize', 'off');
		alt.setAttribute('spellcheck', 'false');
		alt.removeAttribute('name');
		alt.classList.toggle('cursor-not-allowed', disabled);
		alt.classList.toggle('opacity-50', disabled);
		alt.required = required && !disabled;
	};

	onMount(() => {
		if (!inputEl) return;

		inputEl.autocomplete = 'off';

		const altClass = variant === 'filter' ? 'app-filter-input cursor-pointer' : 'datetime-picker-input';

		let instance: Instance | null = null;

		instance = flatpickr(inputEl, {
			enableTime: false,
			clickOpens: false,
			allowInput: true,
			disableMobile: true,
			dateFormat: 'Y-m-d',
			altInput: true,
			altFormat: 'd/m/Y',
			altInputClass: altClass,
			defaultDate: localDateToDate(value) ?? undefined,
			onChange: (dates) => {
				value = dates[0] ? dateToLocalDate(dates[0]) : '';
			},
			onClose: () => {
				isEditing = false;
			},
			onReady: (_dates, _str, instance) => {
				syncAltInput(instance);
				const alt = instance.altInput;
				if (!alt) return;

				alt.addEventListener('focus', () => {
					isEditing = true;
					if (!alt.disabled) instance.open();
				});
				alt.addEventListener('blur', () => {
					isEditing = false;
				});
			}
		});

		picker = instance;

		return () => {
			instance?.destroy();
			picker = null;
		};
	});

	$effect(() => {
		if (!picker || isEditing) return;

		syncAltInput(picker);

		const externalDate = value ? localDateToDate(value) : null;
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
	<!-- svelte-ignore a11y_label_has_associated_control -->
	<label id={labelId} class={labelClass}>{label}</label>
	<input bind:this={inputEl} {id} type="text" data-input class="hidden" autocomplete="off" />
</div>
