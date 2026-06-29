<script lang="ts">
	import { formatCountdown, formatUptime } from '../datetime';

	let {
		startAt,
		endAt,
		showRemaining: showRemainingProp = true,
		variant = 'compact',
		class: className = ''
	}: {
		startAt: string;
		endAt: string;
		/** Hide time-left when the session ended early or reached scheduled end. */
		showRemaining?: boolean;
		/** `compact` for list tiles; `banner` for live/control pages. */
		variant?: 'compact' | 'banner';
		class?: string;
	} = $props();

	let nowMs = $state(Date.now());

	const startMs = $derived(new Date(startAt).getTime());
	const endMs = $derived(new Date(endAt).getTime());
	const showUptime = $derived(!Number.isNaN(startMs) && nowMs >= startMs);
	const showRemaining = $derived(
		showRemainingProp && !Number.isNaN(endMs) && nowMs < endMs
	);
	const uptimeLabel = $derived(formatUptime(startAt, nowMs));
	const remainingLabel = $derived(formatCountdown(endAt, nowMs));

	$effect(() => {
		if (typeof window === 'undefined' || (!showUptime && !showRemaining)) return;

		const timer = window.setInterval(() => {
			nowMs = Date.now();
		}, 1_000);

		return () => window.clearInterval(timer);
	});
</script>

{#if showUptime || showRemaining}
	{#if variant === 'banner'}
		<div class="app-session-timer-banner {className}" aria-live="polite">
			{#if showUptime}
				<div class="app-session-timer-banner-cell app-session-timer-banner-cell--uptime">
					<span class="app-session-timer-banner-label text-emerald-800">
						<span class="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true"></span>
						Uptime
					</span>
					<span class="app-session-timer-banner-value text-emerald-900">{uptimeLabel}</span>
				</div>
			{/if}
			{#if showRemaining}
				<div class="app-session-timer-banner-cell app-session-timer-banner-cell--remaining">
					<span class="app-session-timer-banner-label text-amber-800">
						<span class="h-2 w-2 animate-pulse rounded-full bg-amber-500" aria-hidden="true"></span>
						Time left
					</span>
					<span class="app-session-timer-banner-value text-amber-900">{remainingLabel}</span>
				</div>
			{/if}
		</div>
	{:else}
		<div class="flex w-full justify-center {className}">
			<div class="app-session-timer-group" aria-live="polite">
				{#if showUptime}
					<p class="app-session-countdown-compact">
						<span class="app-session-countdown-compact-label text-emerald-700">Uptime</span>
						<span class="app-session-countdown-compact-value text-emerald-900">{uptimeLabel}</span>
					</p>
				{/if}
				{#if showRemaining}
					<p class="app-session-countdown-compact">
						<span class="app-session-countdown-compact-label text-amber-700">Time left</span>
						<span class="app-session-countdown-compact-value text-amber-900">{remainingLabel}</span>
					</p>
				{/if}
			</div>
		</div>
	{/if}
{/if}
