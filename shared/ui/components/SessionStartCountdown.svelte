<script lang="ts">
	import {
		formatCountdown,
		isWithinPreStartWindow,
		SESSION_PRE_START_LEAD_MINUTES
	} from '../datetime';

	let {
		startAt,
		leadMinutes = SESSION_PRE_START_LEAD_MINUTES,
		showUntilStart = false,
		active = true,
		label = 'Starts in',
		variant = 'banner',
		class: className = ''
	}: {
		startAt: string;
		leadMinutes?: number;
		/** When true, show for the full time until start (player detail sheet). Default keeps the admin T−15 window. */
		showUntilStart?: boolean;
		active?: boolean;
		label?: string;
		variant?: 'banner' | 'compact' | 'inline';
		class?: string;
	} = $props();

	let nowMs = $state(Date.now());

	const startMs = $derived(new Date(startAt).getTime());

	const visible = $derived(
		active &&
			!Number.isNaN(startMs) &&
			(showUntilStart ? nowMs < startMs : isWithinPreStartWindow(startAt, leadMinutes, nowMs))
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
	{#if variant === 'compact'}
		<p class="app-session-countdown-compact {className}" aria-live="polite">
			<span class="app-session-countdown-compact-label">{label}</span>
			<span class="app-session-countdown-compact-value">{countdownLabel}</span>
		</p>
	{:else if variant === 'inline'}
		<p class="app-session-countdown-inline {className}" aria-live="polite">
			<span class="app-session-countdown-inline-label">{label}</span>
			<span class="app-session-countdown-inline-value">{countdownLabel}</span>
		</p>
	{:else}
		<div class="app-session-countdown {className}" aria-live="polite">
			<span class="app-session-countdown-label">
				<span class="h-2 w-2 animate-pulse rounded-full bg-brand-600" aria-hidden="true"></span>
				{label}
			</span>
			<span class="app-session-countdown-value">{countdownLabel}</span>
		</div>
	{/if}
{/if}
