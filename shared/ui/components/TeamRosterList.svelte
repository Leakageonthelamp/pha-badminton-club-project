<script lang="ts">
	import type { MatchPlayerLike } from '../matches';

	let {
		players = [],
		names,
		align = 'center',
		itemClass = 'text-xs text-slate-500'
	}: {
		players?: MatchPlayerLike[];
		names?: string[];
		align?: 'left' | 'center';
		itemClass?: string;
	} = $props();

	const rosterNames = $derived(
		names ?? players.map((player) => player.displayName ?? 'Player')
	);
</script>

{#if rosterNames.length}
	<ul class="mt-1 space-y-0.5 {align === 'center' ? 'text-center' : ''}">
		{#each rosterNames as name, index (index)}
			<li class="truncate {itemClass}">{name}</li>
		{/each}
	</ul>
{/if}
