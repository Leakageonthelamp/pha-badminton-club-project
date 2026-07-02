<script lang="ts">
	import CheckIcon from '../icons/CheckIcon.svelte';
	import ComputerDesktopIcon from '../icons/ComputerDesktopIcon.svelte';
	import MoonIcon from '../icons/MoonIcon.svelte';
	import SunIcon from '../icons/SunIcon.svelte';
	import { setThemePref, theme, type ThemePref } from '../theme.svelte';

	const options: { value: ThemePref; label: string; Icon: typeof SunIcon }[] = [
		{ value: 'light', label: 'Light', Icon: SunIcon },
		{ value: 'dark', label: 'Dark', Icon: MoonIcon },
		{ value: 'system', label: 'System', Icon: ComputerDesktopIcon }
	];

	function optionClass(value: ThemePref) {
		return theme.pref === value
			? 'bg-brand-50 text-brand-800 dark:bg-slate-900/50 dark:text-brand-200'
			: '';
	}
</script>

<div class="px-1.5 py-1" role="group" aria-label="Theme">
	<p class="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
		Theme
	</p>
	<div class="space-y-0.5">
		{#each options as option (option.value)}
			<button
				type="button"
				role="menuitemradio"
				aria-checked={theme.pref === option.value}
				class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 {optionClass(option.value)}"
				onclick={() => setThemePref(option.value)}
			>
				<option.Icon class="h-5 w-5 shrink-0" />
				<span class="flex-1">{option.label}</span>
				{#if theme.pref === option.value}
					<span class="app-menu-selected-mark">
						<CheckIcon class="app-menu-selected-mark__icon" />
					</span>
				{/if}
			</button>
		{/each}
	</div>
</div>
