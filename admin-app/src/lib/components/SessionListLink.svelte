<script lang="ts">
	import SessionStartCountdown from '@repo/ui/components/SessionStartCountdown.svelte';
	import { formatDraftOpenDeadline, formatSessionMeta } from '$lib/sessions/list';
	import {
		sessionStatusBadgeClass,
		sessionStatusLabel,
		type SessionListItem
	} from '$lib/types/session';

	let {
		session,
		userId,
		showClub = false,
		compact = false,
		pendingCancellationFees = 0
	}: {
		session: SessionListItem;
		userId?: string;
		showClub?: boolean;
		compact?: boolean;
		pendingCancellationFees?: number;
	} = $props();
</script>

<a
	href="/sessions/{session.id}"
	class="group block rounded-2xl border bg-white/90 px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md {pendingCancellationFees > 0
		? 'border-amber-300 bg-amber-50/50 hover:border-amber-400'
		: 'border-white/60 hover:border-brand-200'} {compact ? '' : 'sm:px-5 sm:py-4'}"
>
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-2">
				<p class="font-semibold text-slate-900 group-hover:text-brand-800">{session.name}</p>
				<span
					class="rounded-full px-2 py-0.5 text-xs font-medium {sessionStatusBadgeClass(
						session.status
					)}"
				>
					{sessionStatusLabel(session.status)}
				</span>
				{#if userId && session.host_id === userId}
					<span class="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
						Yours
					</span>
				{/if}
			</div>
			<p class="mt-1 text-sm text-slate-600">{formatSessionMeta(session, { showClub })}</p>
			<SessionStartCountdown
				startAt={session.start_at}
				active={session.status === 'open'}
				showUntilStart
				variant="inline"
				class="mt-1"
			/>
			{#if session.status === 'draft'}
				<p class="mt-1 text-xs font-medium text-amber-800">
					Open by {formatDraftOpenDeadline(session.start_at)} — tap to review or publish
				</p>
			{/if}
			{#if pendingCancellationFees > 0}
				<p
					class="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900"
				>
					<span
						class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white"
					>
						{pendingCancellationFees}
					</span>
					<span>
						Cancellation fee{pendingCancellationFees === 1 ? '' : 's'} need confirmation or waiver
					</span>
				</p>
			{/if}
			{#if session.venue_name}
				<p class="mt-1 truncate text-xs text-slate-500">{session.venue_name}</p>
			{/if}
		</div>
		<span class="shrink-0 text-brand-600 opacity-0 transition group-hover:opacity-100" aria-hidden="true"
			>→</span
		>
	</div>
</a>
