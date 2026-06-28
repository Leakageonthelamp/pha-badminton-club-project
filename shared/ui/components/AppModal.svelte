<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { portal } from '../actions/portal';
	import {
		modalBackdropTransition,
		modalPanelTransition,
		modalPanelTransitionReduced,
		prefersReducedMotion
	} from '../transitions/modal';

	let {
		open = false,
		labelledBy,
		closeLabel = 'Close dialog',
		onClose,
		children
	}: {
		open?: boolean;
		labelledBy: string;
		closeLabel?: string;
		onClose?: () => void;
		children: import('svelte').Snippet;
	} = $props();

	let mounted = $state(false);
	let reduceMotion = $state(false);

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
			if (event.key === 'Escape') {
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
		<button
			type="button"
			class="absolute inset-0 z-0 cursor-default"
			aria-label={closeLabel}
			onclick={() => onClose?.()}
		></button>

		<div
			class="relative z-10 w-full max-w-lg"
			in:fly={panelTransition}
			out:fly={panelTransition}
			onoutroend={onPanelOutroEnd}
		>
			{@render children()}
		</div>
	</div>
{/if}
