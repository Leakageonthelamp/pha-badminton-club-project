<script lang="ts">
	import SessionDurationPill from './SessionDurationPill.svelte';
	import SessionTimeRemaining from './SessionTimeRemaining.svelte';

	let {
		startAt,
		endAt,
		status,
		class: className = ''
	}: {
		startAt: string;
		endAt: string;
		status: 'draft' | 'open' | 'in_progress' | 'closed' | 'cancelled';
		class?: string;
	} = $props();

	const showRemaining = $derived(status === 'in_progress');
</script>

<div class="flex flex-wrap items-center justify-center gap-1.5 {className}">
	<SessionDurationPill {startAt} {endAt} />
	{#if showRemaining}
		<SessionTimeRemaining {endAt} />
	{/if}
</div>
