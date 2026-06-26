<script lang="ts">
	import { onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { getTransitionDirection, isWorkspaceHomeSwitch } from '$lib/navigation/back';
	import type { AdminDashboardMode } from '$lib/server/adminDashboardMode';
	import type { AppRole } from '$lib/types/auth';

	let {
		appRole = null,
		dashboardMode = 'super',
		hasClubMembership = false,
		children
	}: {
		appRole?: AppRole | null;
		dashboardMode?: AdminDashboardMode;
		hasClubMembership?: boolean;
		children: import('svelte').Snippet;
	} = $props();

	let direction = $state<'forward' | 'back'>('forward');
	let animate = $state(false);
	let workspaceSwitch = $state(false);

	onNavigate((navigation) => {
		if (!navigation.from) {
			return;
		}

		const from = navigation.from.url.pathname;
		const to = navigation.to?.url.pathname ?? '';
		workspaceSwitch = isWorkspaceHomeSwitch(from, to);
		direction =
			navigation.type === 'popstate'
				? 'back'
				: getTransitionDirection(from, to, appRole, dashboardMode, hasClubMembership);

		// Same path (e.g. /users search) — skip slide transform so fixed menus stay viewport-relative.
		if (from === to) {
			animate = false;
			return;
		}

		animate = true;
	});
</script>

<main class="page-shell">
	{#key page.url.pathname}
		<div
			class="page-panel"
			class:page-panel--animated={animate}
			class:page-panel--workspace={workspaceSwitch}
			data-transition={direction}
			style:--page-enter-x={direction === 'forward' ? '1rem' : '-1rem'}
		>
			{@render children()}
		</div>
	{/key}
</main>
