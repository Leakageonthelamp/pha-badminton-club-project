<script lang="ts">
	let {
		courtCount,
		matches = []
	}: {
		courtCount: number;
		matches?: Array<{
			courtNumber: number;
			status?: string;
			players?: string[];
			score?: string;
			game?: string;
		}>;
	} = $props();

	const courts = $derived(
		Array.from({ length: courtCount }, (_, index) => {
			const courtNumber = index + 1;
			const match = matches.find((entry) => entry.courtNumber === courtNumber);
			return { courtNumber, match };
		})
	);
</script>

<div class="grid gap-3 sm:grid-cols-2">
	{#each courts as court (court.courtNumber)}
		<div class="app-muted-panel space-y-3 p-4">
			<div class="flex items-center justify-between gap-2">
				<p class="text-sm font-semibold text-slate-800">Court {court.courtNumber}</p>
				<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
					{court.match?.status ?? 'Idle'}
				</span>
			</div>

			<div
				class="relative mx-auto aspect-[2/3] w-full max-w-[140px] rounded-2xl border-2 border-brand-300 bg-gradient-to-b from-brand-50 to-white"
				aria-hidden="true"
			>
				<div class="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 bg-brand-300"></div>
				<div class="absolute inset-y-3 left-1/2 w-0.5 -translate-x-1/2 bg-brand-300"></div>
			</div>

			{#if court.match?.players?.length}
				<p class="text-xs text-slate-600">{court.match.players.join(' · ')}</p>
			{:else}
				<p class="text-xs text-slate-500">No match assigned</p>
			{/if}

			{#if court.match?.score}
				<p class="text-sm font-medium text-slate-800">Score: {court.match.score}</p>
			{/if}

			{#if court.match?.game}
				<p class="text-xs text-slate-500">Game {court.match.game}</p>
			{/if}
		</div>
	{/each}
</div>
