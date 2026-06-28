<script lang="ts">
	import {
		formatCountdown,
		isWithinPreStartWindow,
		SESSION_PRE_START_LEAD_MINUTES
	} from '../datetime';

	let {
		startAt,
		leadMinutes = SESSION_PRE_START_LEAD_MINUTES,
		active = true,
		label = 'Starts in',
		class: className = ''
	}: {
		startAt: string;
		leadMinutes?: number;
		active?: boolean;
		label?: string;
		class?: string;
	} = $props();

	let nowMs = $state(Date.now());

	const visible = $derived(
		active && isWithinPreStartWindow(startAt, leadMinutes, nowMs)
	);
	const countdownLabel = $derived(formatCountdown(startAt, nowMs));

	$effect(() => {
		if (typeof window === 'undefined' || !visible) return;

		const timer = window.setInterval(() => {
			nowMs = Date.now();
		}, 1_000);

		return () => window.clearInterval(timer);
	});
</script>

{#if visible}
	<div class="app-session-countdown {className}" aria-live="polite">
		<span class="app-session-countdown-label">
			<span class="h-2 w-2 animate-pulse rounded-full bg-brand-600" aria-hidden="true"></span>
			{label}
		</span>
		<span class="app-session-countdown-value">{countdownLabel}</span>
	</div>
{/if}
