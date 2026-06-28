<script lang="ts">
	import { portal } from '../actions/portal';
	import ChevronDownIcon from '../icons/ChevronDownIcon.svelte';

	export type SelectOption = {
		value: string;
		label: string;
		hint?: string;
		disabled?: boolean;
	};

	let {
		id,
		label,
		options,
		value = $bindable(''),
		disabled = false,
		truncate = true,
		onchange
	}: {
		id: string;
		label: string;
		options: SelectOption[];
		value?: string;
		disabled?: boolean;
		truncate?: boolean;
		onchange?: (value: string) => void;
	} = $props();

	let open = $state(false);
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let menuTop = $state(0);
	let menuLeft = $state(0);
	let menuWidth = $state(0);
	let listboxId = $derived(`${id}-listbox`);

	const selectedOption = $derived(options.find((option) => option.value === value) ?? null);
	const selectedLabel = $derived(selectedOption?.label ?? 'Select…');

	function updateMenuPosition() {
		if (!triggerEl) return;

		const rect = triggerEl.getBoundingClientRect();
		menuTop = rect.bottom + 6;
		menuLeft = rect.left;
		menuWidth = rect.width;
	}

	function closeMenu() {
		open = false;
	}

	function toggleMenu() {
		if (disabled) return;
		open = !open;
		if (open) updateMenuPosition();
	}

	function selectOption(option: SelectOption) {
		if (option.disabled) return;

		value = option.value;
		closeMenu();
		onchange?.(option.value);
		triggerEl?.focus();
	}

	function onTriggerKeydown(event: KeyboardEvent) {
		if (disabled) return;

		if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			open = true;
			updateMenuPosition();
		}

		if (event.key === 'Escape') {
			closeMenu();
		}
	}

	function onListboxKeydown(event: KeyboardEvent) {
		const enabled = options.filter((option) => !option.disabled);
		const currentIndex = enabled.findIndex((option) => option.value === value);

		if (event.key === 'Escape') {
			event.preventDefault();
			closeMenu();
			triggerEl?.focus();
			return;
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			const next = enabled[Math.min(currentIndex + 1, enabled.length - 1)] ?? enabled[0];
			if (next) selectOption(next);
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			const prev = enabled[Math.max(currentIndex - 1, 0)] ?? enabled[0];
			if (prev) selectOption(prev);
		}
	}

	$effect(() => {
		if (!open) return;

		updateMenuPosition();
		const onLayoutChange = () => updateMenuPosition();
		window.addEventListener('resize', onLayoutChange);
		window.addEventListener('scroll', onLayoutChange, true);

		return () => {
			window.removeEventListener('resize', onLayoutChange);
			window.removeEventListener('scroll', onLayoutChange, true);
		};
	});
</script>

<div class="relative">
	<label for={id} class="mb-2 block text-sm font-medium text-slate-700">{label}</label>

	<button
		bind:this={triggerEl}
		{id}
		type="button"
		class="app-select-trigger"
		class:app-select-trigger--open={open}
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls={listboxId}
		{disabled}
		onclick={toggleMenu}
		onkeydown={onTriggerKeydown}
	>
		<span class="min-w-0 text-left {truncate ? 'truncate' : 'whitespace-normal'}">{selectedLabel}</span>
		<ChevronDownIcon class="h-5 w-5 shrink-0 text-brand-500 transition {open ? 'rotate-180' : ''}" />
	</button>

	{#if open}
		<div use:portal>
			<button
				type="button"
				class="fixed inset-0 z-[100] cursor-default"
				aria-label="Close menu"
				onclick={closeMenu}
			></button>

			<ul
				id={listboxId}
				role="listbox"
				aria-labelledby={id}
				tabindex="-1"
				class="app-select-menu z-[110]"
				style:top="{menuTop}px"
				style:left="{menuLeft}px"
				style:width="{menuWidth}px"
				onkeydown={onListboxKeydown}
			>
				{#each options as option (option.value)}
					<li role="presentation">
						<button
							type="button"
							role="option"
							aria-selected={value === option.value}
							disabled={option.disabled}
							class="app-select-option"
							class:app-select-option--selected={value === option.value}
							onclick={() => selectOption(option)}
						>
							<span class="min-w-0 {truncate ? 'truncate' : 'whitespace-normal'}">{option.label}</span>
							{#if option.hint}
								<span class="shrink-0 text-xs font-medium text-slate-400">{option.hint}</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
