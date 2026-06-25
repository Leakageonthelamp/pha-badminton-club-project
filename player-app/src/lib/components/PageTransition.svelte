<script lang="ts">
	import { onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { getTransitionDirection } from '$lib/navigation/back';

	let { children }: { children: import('svelte').Snippet } = $props();

	let direction = $state<'forward' | 'back'>('forward');
	let animate = $state(false);

	onNavigate((navigation) => {
		if (!navigation.from) {
			return;
		}

		animate = true;
		const from = navigation.from.url.pathname;
		const to = navigation.to?.url.pathname ?? '';
		direction = navigation.type === 'popstate' ? 'back' : getTransitionDirection(from, to);
	});
</script>

<main class="page-shell flex-1 overflow-x-hidden">
	{#key page.url.pathname}
		<div
			class="page-panel"
			class:page-panel--animated={animate}
			data-transition={direction}
			style:--page-enter-x={direction === 'forward' ? '1rem' : '-1rem'}
		>
			{@render children()}
		</div>
	{/key}
</main>
