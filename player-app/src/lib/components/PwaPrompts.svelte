<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import AppLogo from '$lib/components/AppLogo.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import {
		bottomBannerTransition,
		bottomBannerTransitionReduced,
		prefersReducedMotion
	} from '@repo/ui/transitions/modal';
	import { useRegisterSW } from 'virtual:pwa-register/svelte';

	let { appName = 'App' }: { appName?: string } = $props();

	let reduceMotion = $state(false);
	const bannerTransition = $derived(
		reduceMotion ? bottomBannerTransitionReduced : bottomBannerTransition
	);

	const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
		onRegistered: () => {
			console.info('PWA service worker registered');
		},
		onRegisterError: (error) => {
			console.error('PWA service worker registration failed', error);
		}
	});

	let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
	let showInstall = $state(false);
	let isStandalone = $state(false);
	let installing = $state(false);
	let reloading = $state(false);

	onMount(() => {
		reduceMotion = prefersReducedMotion();

		isStandalone =
			window.matchMedia('(display-mode: standalone)').matches ||
			('standalone' in navigator &&
				(navigator as Navigator & { standalone?: boolean }).standalone === true);

		const onBeforeInstallPrompt = (event: Event) => {
			event.preventDefault();
			deferredPrompt = event as BeforeInstallPromptEvent;
			showInstall = true;
		};

		const onAppInstalled = () => {
			deferredPrompt = null;
			showInstall = false;
		};

		window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
		window.addEventListener('appinstalled', onAppInstalled);

		return () => {
			window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
			window.removeEventListener('appinstalled', onAppInstalled);
		};
	});

	const installApp = async () => {
		if (!deferredPrompt || installing) return;

		installing = true;
		try {
			await deferredPrompt.prompt();
			await deferredPrompt.userChoice;
			deferredPrompt = null;
			showInstall = false;
		} finally {
			installing = false;
		}
	};

	const dismissInstall = () => {
		showInstall = false;
	};

	const dismissOfflineReady = () => {
		$offlineReady = false;
	};

	const reloadForUpdate = async () => {
		if (reloading) return;

		reloading = true;
		try {
			await updateServiceWorker(true);
		} finally {
			reloading = false;
		}
	};

	const dismissUpdate = () => {
		$needRefresh = false;
	};
</script>

{#if $offlineReady}
	<div
		class="fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
		role="status"
		in:fly={bannerTransition}
		out:fly={bannerTransition}
	>
		<p class="text-sm font-medium text-slate-900">App ready to work offline.</p>
		<div class="mt-3 flex gap-2">
			<button
				type="button"
				class="rounded-lg bg-brand-700 px-3 py-2 text-sm font-medium text-white"
				onclick={dismissOfflineReady}
			>
				OK
			</button>
		</div>
	</div>
{/if}

{#if $needRefresh}
	<div
		class="fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-brand-200 bg-brand-50 p-4 shadow-lg"
		role="alert"
		in:fly={bannerTransition}
		out:fly={bannerTransition}
	>
		<div class="flex items-start gap-3">
			<AppLogo size={36} />
			<div>
				<p class="text-sm font-medium text-brand-900">A new version is available.</p>
		<div class="mt-3 flex gap-2">
			<SubmitButton
				type="button"
				variant="primary"
				class="w-auto! rounded-lg px-3 py-2 text-sm font-medium"
				loading={reloading}
				loadingLabel="Reloading…"
				onclick={reloadForUpdate}
			>
				Reload
			</SubmitButton>
			<SubmitButton
				type="button"
				variant="ghost"
				class="w-auto! rounded-lg px-3 py-2 text-sm font-medium text-brand-800"
				onclick={dismissUpdate}
			>
				Later
			</SubmitButton>
		</div>
			</div>
		</div>
	</div>
{/if}

{#if showInstall && !isStandalone}
	<div
		class="fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
		role="dialog"
		aria-label="Install app"
		in:fly={bannerTransition}
		out:fly={bannerTransition}
	>
		<div class="flex items-start gap-3">
			<AppLogo size={40} />
			<div>
				<p class="text-sm font-medium text-slate-900">Install {appName}</p>
				<p class="mt-1 text-sm text-slate-600">
					Add to your home screen for a full-screen app experience.
				</p>
			</div>
		</div>
		<div class="mt-3 flex gap-2">
			<SubmitButton
				type="button"
				variant="primary"
				class="w-auto! rounded-lg px-3 py-2 text-sm font-medium"
				loading={installing}
				loadingLabel="Installing…"
				onclick={installApp}
			>
				Install
			</SubmitButton>
			<SubmitButton
				type="button"
				variant="ghost"
				class="w-auto! rounded-lg px-3 py-2 text-sm font-medium text-slate-600"
				onclick={dismissInstall}
			>
				Not now
			</SubmitButton>
		</div>
	</div>
{/if}
