<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { portal } from '../actions/portal';
	import XMarkIcon from '../icons/XMarkIcon.svelte';
	import { t } from '../i18n/i18n.svelte';
	import {
		modalBackdropTransition,
		modalPanelTransition,
		modalPanelTransitionReduced,
		prefersReducedMotion
	} from '../transitions/modal';

	let {
		open = false,
		labelledBy,
		closeLabel,
		closeOnBackdrop = true,
		closeOnEscape = true,
		onClose,
		children
	}: {
		open?: boolean;
		labelledBy: string;
		closeLabel?: string;
		closeOnBackdrop?: boolean;
		closeOnEscape?: boolean;
		onClose?: () => void;
		children: import('svelte').Snippet;
	} = $props();

	let mounted = $state(false);
	let reduceMotion = $state(false);

	const resolvedCloseLabel = $derived(closeLabel ?? t('common.closeDialog'));

	const showCloseButton = $derived(
		Boolean(onClose) && (closeOnBackdrop || closeOnEscape)
	);

	const backdropTransition = $derived(
		reduceMotion ? modalPanelTransitionReduced : modalBackdropTransition
	);
	const panelTransition = $derived(
		reduceMotion ? modalPanelTransitionReduced : modalPanelTransition
	);

	$effect(() => {
		if (open) mounted = true;
		else mounted = false;
	});

	$effect(() => {
		if (!mounted || typeof document === 'undefined') return;

		reduceMotion = prefersReducedMotion();

		const scrollEl = document.querySelector('.app-scroll');
		const previousOverflow =
			scrollEl instanceof HTMLElement ? scrollEl.style.overflow : undefined;

		if (scrollEl instanceof HTMLElement) {
			scrollEl.style.overflow = 'hidden';
		}

		const onKeydown = (event: KeyboardEvent) => {
			if (closeOnEscape && event.key === 'Escape') {
				onClose?.();
			}
		};

		document.addEventListener('keydown', onKeydown);

		return () => {
			document.removeEventListener('keydown', onKeydown);

			if (scrollEl instanceof HTMLElement) {
				scrollEl.style.overflow = previousOverflow ?? '';
			}
		};
	});

	function onPanelOutroEnd() {
		if (!open) mounted = false;
	}
</script>

{#if mounted}
	<div
		use:portal
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby={labelledBy}
		in:fade={backdropTransition}
		out:fade={backdropTransition}
	>
		{#if closeOnBackdrop}
			<button
				type="button"
				class="absolute inset-0 z-0 cursor-default"
				aria-label={resolvedCloseLabel}
				onclick={() => onClose?.()}
			></button>
		{:else}
			<div class="absolute inset-0 z-0" aria-hidden="true"></div>
		{/if}

		<div
			class="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto overscroll-contain"
			in:fly={panelTransition}
			out:fly={panelTransition}
			onoutroend={onPanelOutroEnd}
		>
			{#if showCloseButton}
				<button
					type="button"
					class="absolute right-3 top-3 z-20 rounded-lg bg-white/90 p-1.5 text-slate-500 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-800/90 dark:text-slate-400 dark:ring-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
					aria-label={resolvedCloseLabel}
					onclick={() => onClose?.()}
				>
					<XMarkIcon class="h-5 w-5" />
				</button>
			{/if}
			{@render children()}
		</div>
	</div>
{/if}
