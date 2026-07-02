<script lang="ts">
	import ArrowLeftIcon from '../icons/ArrowLeftIcon.svelte';
	import { t } from '../i18n/i18n.svelte';

	let {
		href,
		label
	}: {
		href: string;
		label?: string;
	} = $props();

	const ariaLabel = $derived(label ?? t('nav.goBack'));
</script>

<a
	{href}
	aria-label={ariaLabel}
	class="inline-flex items-center justify-center rounded-xl p-2 text-slate-600 dark:text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
>
	<ArrowLeftIcon class="h-6 w-6" />
</a>
