<script lang="ts">
	import { dev } from '$app/environment';
	import AppLogo from '$lib/components/AppLogo.svelte';
	import { getErrorCopy } from '$lib/errors/copy';

	let { error, status }: { error: App.Error; status: number } = $props();

	const copy = $derived(getErrorCopy(status));
	const detail = $derived(error?.message?.trim() || copy.hint);
</script>

<svelte:head>
	<title>{status} · {copy.title}</title>
</svelte:head>

<section class="flex flex-1 flex-col justify-center py-8">
	<AppLogo size={72} class="mb-6" />
	<p class="text-sm font-medium text-brand-700">{status}</p>
	<h1 class="mt-2 text-2xl font-semibold text-slate-900">{copy.title}</h1>
	<p class="mt-3 text-base leading-relaxed text-slate-600">{copy.hint}</p>

	{#if dev && detail !== copy.hint}
		<p class="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
			{detail}
		</p>
	{/if}

	<a
		href="/"
		class="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-brand-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
	>
		Back to home
	</a>
</section>
