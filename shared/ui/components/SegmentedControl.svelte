<script lang="ts">
	let {
		name,
		value = $bindable(''),
		options,
		disabled = false,
		labelledBy
	}: {
		name: string;
		value: string;
		options: { value: string; label: string; disabled?: boolean }[];
		disabled?: boolean;
		labelledBy?: string;
	} = $props();
</script>

<div
	class="flex rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 p-1"
	role="radiogroup"
	aria-labelledby={labelledBy}
>
	{#each options as option (option.value)}
		{@const optionDisabled = disabled || option.disabled}
		<label class="relative min-w-0 flex-1">
			<input
				type="radio"
				{name}
				value={option.value}
				bind:group={value}
				disabled={optionDisabled}
				class="peer sr-only"
			/>
			<span
				class="flex items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium transition peer-checked:bg-white dark:bg-slate-900 peer-checked:text-brand-700 dark:text-brand-300 peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600/20 peer-disabled:cursor-not-allowed {optionDisabled
					? 'text-slate-400 dark:text-slate-500 opacity-50'
					: 'text-slate-600 dark:text-slate-400 dark:text-slate-500 peer-checked:text-brand-700'}"
			>
				{option.label}
			</span>
		</label>
	{/each}
</div>
