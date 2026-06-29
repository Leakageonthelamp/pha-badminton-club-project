<script lang="ts">
	import { formatUptime } from '../datetime';

	let {
		startAt,
		active = true,
		label = 'Uptime',
		variant = 'banner',
		live = false,
		class: className = ''
	}: {
		startAt: string;
		active?: boolean;
		label?: string;
		variant?: 'banner' | 'compact' | 'inline';
		/** Emerald styling for live in-progress sessions. */
		live?: boolean;
		class?: string;
	} = $props();

	let nowMs = $state(Date.now());

	const startMs = $derived(new Date(startAt).getTime());
	const visible = $derived(active && !Number.isNaN(startMs) && nowMs >= startMs);
	const uptimeLabel = $derived(formatUptime(startAt, nowMs));

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
			<span
				class="app-session-countdown-compact-label {live
					? 'text-emerald-700'
					: ''}"
			>
				{label}
			</span>
			<span
				class="app-session-countdown-compact-value {live
					? 'text-emerald-900'
					: ''}"
			>
				{uptimeLabel}
			</span>
		</p>
	{:else if variant === 'inline'}
		<p class="app-session-countdown-inline {className}" aria-live="polite">
			<span class="app-session-countdown-inline-label {live ? 'text-emerald-700' : ''}">
				{label}
			</span>
			<span class="app-session-countdown-inline-value {live ? 'text-emerald-900' : ''}">
				{uptimeLabel}
			</span>
		</p>
	{:else}
		<div
			class="app-session-countdown {live
				? 'border-emerald-200 bg-emerald-50/80'
				: ''} {className}"
			aria-live="polite"
		>
			<span class="app-session-countdown-label {live ? 'text-emerald-800' : ''}">
				<span
					class="h-2 w-2 animate-pulse rounded-full {live ? 'bg-emerald-500' : 'bg-brand-600'}"
					aria-hidden="true"
				></span>
				{label}
			</span>
			<span class="app-session-countdown-value {live ? 'text-emerald-900' : ''}">
				{uptimeLabel}
			</span>
		</div>
	{/if}
{/if}
