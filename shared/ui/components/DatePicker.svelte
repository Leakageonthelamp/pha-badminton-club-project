<script lang="ts">
	import { onMount } from 'svelte';
	import type { Instance } from 'flatpickr/dist/types/instance';
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
	let validationError = $state('');
	const displayId = $derived(`${id}-display`);
	const labelId = $derived(`${id}-label`);
	const labelClass = $derived(variant === 'filter' ? 'app-filter-label' : 'mb-2 block text-sm font-medium text-slate-700');

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

	const revertToCommitted = (instance: Instance) => {
		syncPickerFromValue(instance);
	};

	const syncPickerFromValue = (instance: Instance) => {
		if (!value) {
			instance.clear(false);
			if (instance.altInput) instance.altInput.value = '';
			return;
		}

		const committed = localDateToDate(value);
		if (committed) instance.setDate(committed, false);
		else {
			instance.clear(false);
			if (instance.altInput) instance.altInput.value = '';
		}
	};

	const validateSelected = (date: Date | undefined): string | null => {
		if (required && !date) return 'Choose a date.';
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
			validationError = '';
			committedThisOpen.current = true;
			instance.clear(false);
			if (instance.altInput) instance.altInput.value = '';
			instance.close();
		});

		selectBtn.addEventListener('click', () => {
			const selected = instance.selectedDates[0];
			const error = validateSelected(selected);
			if (error) {
				validationError = error;
				return;
			}

			validationError = '';
			value = selected ? dateToLocalDate(selected) : '';
			committedThisOpen.current = true;
			instance.close();
		});

		footer.append(clearBtn, selectBtn);
		instance.calendarContainer.appendChild(footer);
	};

	onMount(() => {
		if (!inputEl) return;

		inputEl.autocomplete = 'off';

		const altClass = variant === 'filter' ? 'app-filter-input cursor-pointer' : 'datetime-picker-input';

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
			enableTime: false,
			clickOpens: false,
			closeOnSelect: false,
			allowInput: true,
			disableMobile: true,
			dateFormat: 'Y-m-d',
			altInput: true,
			altFormat: 'd/m/Y',
			altInputClass: altClass,
			defaultDate: localDateToDate(value) ?? undefined,
			onOpen: (_dates, _str, fp) => {
				committedThisOpen.current = false;
				validationError = '';
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

		syncAltInput(picker);

		if (!value) {
			picker.clear(false);
			if (picker.altInput) picker.altInput.value = '';
			return;
		}

		const externalDate = localDateToDate(value);
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
	<label id={labelId} class={labelClass}>{label}</label>
	<input bind:this={inputEl} {id} type="text" data-input class="hidden" autocomplete="off" />
	{#if validationError}
		<p class="datetime-picker-error" role="alert">{validationError}</p>
	{/if}
</div>
