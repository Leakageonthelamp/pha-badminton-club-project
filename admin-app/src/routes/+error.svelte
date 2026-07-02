<script lang="ts">
	import { t } from '$lib/i18n';
	import { dev } from '$app/environment';
	import AppLogo from '$lib/components/AppLogo.svelte';
	import ServiceUnavailable from '$lib/components/ServiceUnavailable.svelte';

	let { error, status }: { error: App.Error; status: number } = $props();

	const ERROR_STATUSES = [400, 401, 403, 404, 500, 503] as const;

	const isServiceDown = $derived(status === 503 || error?.code === 'SERVICE_UNAVAILABLE');
	const copy = $derived(
		ERROR_STATUSES.includes(status as (typeof ERROR_STATUSES)[number])
			? {
					title: t(`errors.${status}.title`),
					hint: t(`errors.${status}.hint`)
				}
			: {
					title: t('errors.500.title'),
					hint: t('errors.500.hint')
				}
	);
	const detail = $derived(error?.message?.trim() || copy.hint);
</script>

<svelte:head>
	<title>{isServiceDown ? t('errors.title.unavailable') : status} · {copy.title}</title>
</svelte:head>

{#if isServiceDown}
	<ServiceUnavailable />
{:else}
	<section class="flex flex-1 flex-col justify-center py-8">
		<AppLogo size={72} class="mb-6" />
		<p class="text-sm font-medium text-brand-700">{status}</p>
		<h1 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{copy.title}</h1>
		<p class="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-400 dark:text-slate-500">{copy.hint}</p>

		{#if dev && detail !== copy.hint}
			<p class="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 dark:text-slate-600">
				{detail}
			</p>
		{/if}

		<a
			href="/"
			class="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-brand-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
		>
			{t('errors.backToHome')}
		</a>
	</section>
{/if}
