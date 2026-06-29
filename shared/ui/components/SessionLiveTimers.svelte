<script lang="ts">
	import { formatCountdown, formatUptime } from '../datetime';

	let {
		startAt,
		endAt,
		class: className = ''
	}: {
		startAt: string;
		endAt: string;
		class?: string;
	} = $props();

	let nowMs = $state(Date.now());

	const startMs = $derived(new Date(startAt).getTime());
	const endMs = $derived(new Date(endAt).getTime());
	const showUptime = $derived(!Number.isNaN(startMs) && nowMs >= startMs);
	const showRemaining = $derived(!Number.isNaN(endMs) && nowMs < endMs);
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
