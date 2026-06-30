<script lang="ts">
	import { onMount } from 'svelte';
	import type { Instance } from 'flatpickr/dist/types/instance';
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
	let validationError = $state('');
	const displayId = $derived(`${id}-display`);
	const labelId = $derived(`${id}-label`);

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
		alt.setAttribute('aria-labelledby', labelId);
		alt.setAttribute('aria-invalid', validationError ? 'true' : 'false');
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

	const refreshMinDate = (instance: Instance) => {
		const minDate = resolveMinDate();
		instance.set('minDate', minDate ?? null);
		return minDate;
	};

	const revertToCommitted = (instance: Instance) => {
		syncPickerFromValue(instance);
	};

	const syncPickerFromValue = (instance: Instance) => {
		if (!value) {
			instance.clear(false);
			if (instance.altInput) instance.altInput.value = '';
			return;
		}

		const committed = localInputToDate(value);
		if (committed) instance.setDate(committed, false);
		else {
			instance.clear(false);
			if (instance.altInput) instance.altInput.value = '';
		}
	};

	const validateSelected = (date: Date | undefined, instance: Instance): string | null => {
		if (required && !date) return 'Choose a date and time.';
		if (!date) return null;

		const minDate = resolveMinDate();
		if (minDate && date.getTime() < minDate.getTime()) {
			return `Must be on or after ${instance.formatDate(minDate, instance.config.altFormat)}.`;
		}

		return null;
	};

	const attachPickerActions = (instance: Instance, committedThisOpen: { current: boolean }) => {
		const footer = document.createElement('div');
		footer.className = 'flatpickr-picker-actions';

		const clearBtn = document.createElement('button');
		clearBtn.type = 'button';
		clearBtn.className = 'flatpickr-action flatpickr-action-clear';
		clearBtn.textContent = 'Clear';

		const selectBtn = document.createElement('button');
		selectBtn.type = 'button';
		selectBtn.className = 'flatpickr-action flatpickr-action-select';
		selectBtn.textContent = 'Select';

		const keepFocus = (event: MouseEvent) => event.preventDefault();

		clearBtn.addEventListener('mousedown', keepFocus);
		selectBtn.addEventListener('mousedown', keepFocus);

		clearBtn.addEventListener('click', () => {
			value = '';
			validationError = required ? 'This field is required.' : '';
			committedThisOpen.current = true;
			instance.clear(false);
			if (instance.altInput) instance.altInput.value = '';
			instance.close();
		});

		selectBtn.addEventListener('click', () => {
			const selected = instance.selectedDates[0];
			const error = validateSelected(selected, instance);
			if (error) {
				validationError = error;
				return;
			}

			validationError = '';
			value = selected ? dateToLocalInput(selected) : '';
			committedThisOpen.current = true;
			instance.close();
		});

		footer.append(clearBtn, selectBtn);
		instance.calendarContainer.appendChild(footer);
	};

	onMount(() => {
		if (!inputEl) return;

		inputEl.autocomplete = 'off';

		let instance: Instance | null = null;
		let destroyed = false;
		const committedThisOpen = { current: false };

		void (async () => {
			const [{ default: flatpickr }] = await Promise.all([
				import('flatpickr'),
				import('flatpickr/dist/flatpickr.min.css')
			]);
			if (destroyed || !inputEl) return;

			instance = flatpickr(inputEl, {
			enableTime: true,
			time_24hr: true,
			clickOpens: false,
			closeOnSelect: false,
			allowInput: true,
			disableMobile: true,
			minuteIncrement: 1,
			dateFormat: 'Y-m-d H:i',
			altInput: true,
			altFormat: 'd/m/Y, H:i',
			altInputClass: 'datetime-picker-input',
			defaultDate: localInputToDate(value) ?? undefined,
			minDate: resolveMinDate(),
			onOpen: (_dates, _str, fp) => {
				committedThisOpen.current = false;
				validationError = '';
				refreshMinDate(fp);
				revertToCommitted(fp);
			},
			onClose: (_dates, _str, fp) => {
				isEditing = false;
				if (!committedThisOpen.current) revertToCommitted(fp);
				committedThisOpen.current = false;
			},
			onReady: (_dates, _str, fp) => {
				syncAltInput(fp);
				attachPickerActions(fp, committedThisOpen);

				const alt = fp.altInput;
				if (!alt) return;

				alt.addEventListener('focus', () => {
					isEditing = true;
					if (!alt.disabled) fp.open();
				});
				alt.addEventListener('blur', () => {
					if (fp.isOpen) return;
					isEditing = false;
				});
			}
		});

			picker = instance;
		})();

		return () => {
			destroyed = true;
			instance?.destroy();
			picker = null;
		};
	});

	$effect(() => {
		picker?.altInput?.setAttribute('aria-invalid', validationError ? 'true' : 'false');
	});

	$effect(() => {
		if (!picker || isEditing) return;

		refreshMinDate(picker);
		syncAltInput(picker);

		if (!value) {
			picker.clear(false);
			if (picker.altInput) picker.altInput.value = '';
			return;
		}

		const externalDate = localInputToDate(value);
		const selected = picker.selectedDates[0];
		const externalMs = externalDate?.getTime() ?? null;
		const selectedMs = selected?.getTime() ?? null;

		if (externalMs !== selectedMs) {
			if (externalDate) picker.setDate(externalDate, false);
			else {
				picker.clear(false);
				if (picker.altInput) picker.altInput.value = '';
			}
		}
	});
</script>

<div>
	<!-- svelte-ignore a11y_label_has_associated_control -->
	<label id={labelId} class="mb-2 block text-sm font-medium text-slate-700">{label}</label>
	<input bind:this={inputEl} {id} type="text" data-input class="hidden" autocomplete="off" />
	{#if validationError}
		<p class="datetime-picker-error" role="alert">{validationError}</p>
	{/if}
</div>
