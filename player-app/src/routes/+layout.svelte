<script lang="ts">
	import '../app.css';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { appConfig } from '$lib/config/app';
	import PwaHead from '$lib/components/PwaHead.svelte';
	import PwaPrompts from '$lib/components/PwaPrompts.svelte';
	import ServiceUnavailable from '$lib/components/ServiceUnavailable.svelte';
	import LocationPermissionPrompt from '@repo/ui/components/LocationPermissionPrompt.svelte';
	import ToastContainer from '@repo/ui/components/ToastContainer.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const year = new Date().getFullYear();

	// Show a loading spinner on the exact link the user tapped while its page loads.
	let pendingLink: HTMLElement | null = null;
	let pendingTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		const onClick = (event: MouseEvent) => {
			const link = (event.target as Element | null)?.closest('a[href]');
			pendingLink = link instanceof HTMLElement ? link : null;
		};
		document.addEventListener('click', onClick, true);
		return () => document.removeEventListener('click', onClick, true);
	});

	const clearPending = () => {
		if (pendingTimer) clearTimeout(pendingTimer);
		pendingTimer = null;
		pendingLink?.classList.remove('nav-loading');
		pendingLink?.removeAttribute('aria-busy');
		pendingLink = null;
	};

	beforeNavigate((nav) => {
		if (nav.type !== 'link' || !nav.to || !pendingLink) return;
		const link = pendingLink;
		// Delay so fast (preloaded) navigations don't flash a spinner.
		pendingTimer = setTimeout(() => {
			link.classList.add('nav-loading');
			link.setAttribute('aria-busy', 'true');
		}, 120);
	});

	afterNavigate(clearPending);
</script>

<PwaHead />

<svelte:head>
	<title>{appConfig.name}</title>
	<meta name="apple-mobile-web-app-title" content={appConfig.shortName} />
</svelte:head>

<div class="app-shell relative mx-auto flex h-full w-full max-w-lg flex-col">
	<div class="app-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pt-6">
		{#if data.serviceUnavailable}
			<ServiceUnavailable />
		{:else}
			<LocationPermissionPrompt
				description="Allow location access so we can show nearby clubs and improve your experience."
			/>
			{@render children()}
		{/if}
	</div>

	<footer class="app-footer shrink-0 px-4 text-center text-[10px] leading-tight text-slate-400">
		<p>© {year} {appConfig.name}</p>
	</footer>
</div>

<ToastContainer />

{#if !data.serviceUnavailable}
	<PwaPrompts appName={appConfig.name} />
{/if}
