<script lang="ts">
	import { page } from '$app/state';
	import AppLogo from '$lib/components/AppLogo.svelte';
	import BackLink from '@repo/ui/components/BackLink.svelte';
	import LocalePicker from '@repo/ui/components/LocalePicker.svelte';
	import PageTransition from '$lib/components/PageTransition.svelte';
	import { appConfig } from '$lib/config/app';
	import { getBackHref, shouldShowBack } from '$lib/navigation/back';

	let { children }: { children: import('svelte').Snippet } = $props();

	const showBack = $derived(shouldShowBack(page.url.pathname));
	const backHref = $derived(getBackHref(page.url.pathname));
</script>

<div class="mx-auto flex w-full max-w-lg flex-col">
	<header class="app-topbar mb-6 flex items-center justify-between gap-3">
		{#if showBack}
			<BackLink href={backHref} />
		{:else}
			<a href="/login" class="app-topbar-brand">
				<span class="app-topbar-mark">
					<AppLogo size={32} title={appConfig.name} />
				</span>
				<span class="app-topbar-title">{appConfig.name}</span>
			</a>
		{/if}
		<LocalePicker />
	</header>

	<PageTransition>{@render children()}</PageTransition>
</div>
