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
		emptyMessage = 'No upcoming sessions for this club.'
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
	} = $props();

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
	class="overflow-hidden rounded-3xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 via-white to-violet-50 shadow-sm"
>
	<div class="border-b border-brand-100/80 bg-brand-500/10 px-4 py-4 sm:px-6">
		<div>
			<p class="text-xs font-semibold uppercase tracking-wide text-brand-700">{eyebrow}</p>
			<h2 class="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
				{panelTitle}
			</h2>
			<p class="mt-1 text-sm text-slate-600">
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
					<a href={viewAllHref} class="text-sm font-medium text-brand-700 hover:text-brand-800">
						View all {sessions.length} sessions
					</a>
				</div>
			{/if}
		{/if}
	</div>
</section>
