<script lang="ts">
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SessionListLink from '$lib/components/SessionListLink.svelte';
	import type { SessionListItem } from '$lib/types/session';

	let {
		sessions,
		userId,
		showClub = false,
		limit,
		viewAllHref = '/sessions',
		eyebrow = 'Upcoming sessions',
		title,
		subtitle = 'Your next badminton sessions — tap to view details.',
		emptyMessage = 'No upcoming sessions for this club.',
		tone = 'brand'
	}: {
		sessions: SessionListItem[];
		userId?: string;
		showClub?: boolean;
		limit?: number;
		viewAllHref?: string;
		eyebrow?: string;
		title?: string;
		subtitle?: string;
		emptyMessage?: string;
		tone?: 'brand' | 'amber';
	} = $props();

	const toneClasses = $derived(
		tone === 'amber'
			? {
					section:
						'border-amber-200 from-amber-50 via-white to-orange-50 dark:border-amber-800/80 dark:from-amber-950/40 dark:via-slate-900 dark:to-orange-950/25',
					header:
						'border-amber-100/80 bg-amber-500/10 dark:border-amber-900/50 dark:bg-amber-950/30',
					eyebrow: 'text-amber-800 dark:text-amber-300'
				}
			: {
					section:
						'border-brand-200 from-brand-50 via-white to-violet-50 dark:border-brand-800/80 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/30',
					header:
						'border-brand-100/80 bg-brand-500/10 dark:border-brand-900/50 dark:bg-slate-900/30',
					eyebrow: 'text-brand-700 dark:text-brand-300'
				}
	);

	const visibleSessions = $derived(limit ? sessions.slice(0, limit) : sessions);
	const hasMore = $derived(limit !== undefined && sessions.length > limit);
	const panelTitle = $derived(
		title ??
			(sessions.length === 0
				? 'Nothing scheduled yet'
				: `${sessions.length} session${sessions.length === 1 ? '' : 's'} coming up`)
	);
</script>

<section
	class="overflow-hidden rounded-3xl border-2 bg-gradient-to-br shadow-sm {toneClasses.section}"
>
	<div class="border-b px-4 py-4 sm:px-6 {toneClasses.header}">
		<div>
			<p class="text-xs font-semibold uppercase tracking-wide {toneClasses.eyebrow}">{eyebrow}</p>
			<h2 class="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
				{panelTitle}
			</h2>
			<p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
				{subtitle}
			</p>
		</div>
	</div>

	<div class="space-y-3 p-4 sm:p-6">
		{#if visibleSessions.length === 0}
			<EmptyState message={emptyMessage} />
		{:else}
			<div class="space-y-3">
				{#each visibleSessions as session (session.id)}
					<SessionListLink {session} {userId} {showClub} />
				{/each}
			</div>
			{#if hasMore && viewAllHref}
				<div class="pt-1">
					<a href={viewAllHref} class="text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200">
						View all {sessions.length} sessions
					</a>
				</div>
			{/if}
		{/if}
	</div>
</section>
