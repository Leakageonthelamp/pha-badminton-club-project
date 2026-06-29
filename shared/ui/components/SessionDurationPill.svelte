<script lang="ts">
	import { formatSessionDuration } from '../datetime';

	let {
		startAt,
		endAt,
		class: className = ''
	}: {
		startAt: string;
		endAt: string;
		class?: string;
	} = $props();

	const label = $derived(formatSessionDuration(startAt, endAt));
</script>

{#if label !== '—'}
	<span class="app-tile-badge {className}">{label}</span>
{/if}
