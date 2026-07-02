<script lang="ts">
	import EyeIcon from '../icons/EyeIcon.svelte';
	import { t } from '../i18n/i18n.svelte';

	let {
		onclick,
		label,
		class: className = ''
	}: { onclick: () => void; label?: string; class?: string } = $props();

	const resolvedLabel = $derived(label ?? t('slip.preview'));
</script>

<button
	type="button"
	{onclick}
	class="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-brand-700 dark:text-brand-300 transition-colors hover:bg-brand-50 active:bg-brand-100 {className}"
>
	<EyeIcon class="h-4 w-4" />
	{resolvedLabel}
</button>
