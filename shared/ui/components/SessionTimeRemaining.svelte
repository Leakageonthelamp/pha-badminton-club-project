<script lang="ts">
	import { formatCountdown } from '../datetime';

	let {
		endAt,
		active = true,
		label = 'Time left',
		variant = 'pill',
		class: className = ''
	}: {
		endAt: string;
		active?: boolean;
		label?: string;
		variant?: 'pill' | 'compact' | 'banner';
		class?: string;
	} = $props();

	let nowMs = $state(Date.now());

	const endMs = $derived(new Date(endAt).getTime());
	const visible = $derived(active && !Number.isNaN(endMs) && nowMs < endMs);
	const remainingLabel = $derived(formatCountdown(endAt, nowMs));

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
			<span class="app-session-countdown-compact-label text-amber-700">{label}</span>
			<span class="app-session-countdown-compact-value text-amber-900">{remainingLabel}</span>
		</p>
	{:else if variant === 'banner'}
		<div
			class="app-session-countdown border-amber-200 bg-amber-50/80 {className}"
			aria-live="polite"
		>
			<span class="app-session-countdown-label text-amber-800">
				<span class="h-2 w-2 animate-pulse rounded-full bg-amber-500" aria-hidden="true"></span>
				{label}
			</span>
			<span class="app-session-countdown-value text-amber-900">{remainingLabel}</span>
		</div>
	{:else}
		<span class="app-tile-badge app-tile-badge--brand {className}" aria-live="polite">
			{label} {remainingLabel}
		</span>
	{/if}
{/if}
