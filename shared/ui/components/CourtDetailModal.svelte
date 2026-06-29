<script lang="ts">
	import AppModal from './AppModal.svelte';
	import CourtIcon from './CourtIcon.svelte';
	import {
		courtGridStatusLabel,
		matchStatusBadgeClass,
		matchStatusLabel
	} from '../matches';
	import type { MatchStatus } from '../matches';

	export type CourtDetailLike = {
		courtNumber: number;
		status?: MatchStatus;
		teamA?: string[];
		teamB?: string[];
		players?: string[];
		score?: string;
	};

	let {
		open = false,
		court = null,
		onClose,
		action
	}: {
		open?: boolean;
		court: CourtDetailLike | null;
		onClose: () => void;
		action?: import('svelte').Snippet;
	} = $props();

	const hasTeams = $derived(Boolean(court?.teamA?.length || court?.teamB?.length));

	const headerAccentClass = $derived.by(() => {
		switch (court?.status) {
			case 'active':
				return 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-brand-50/30';
			case 'suspended':
				return 'border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-amber-50/40';
			case 'score_pending':
				return 'border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-brand-50/30';
			case 'pending':
				return 'border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-brand-50/30';
			default:
				return 'border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-brand-50/40';
		}
	});

	const playerInitial = (name: string) => (name.trim()[0] ?? '?').toUpperCase();
</script>

{#snippet playerRow(name: string, team: 'A' | 'B' | 'neutral')}
	<li
		class="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 {team === 'A'
			? 'border-brand-100 bg-brand-50/60'
			: team === 'B'
				? 'border-slate-200 bg-white'
				: 'border-slate-100 bg-slate-50/80'}"
	>
		<span
			class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold {team ===
			'A'
				? 'bg-brand-100 text-brand-800 ring-2 ring-white'
				: team === 'B'
					? 'bg-slate-200 text-slate-700 ring-2 ring-white'
					: 'bg-slate-100 text-slate-600 ring-2 ring-white'}"
			aria-hidden="true"
		>
			{playerInitial(name)}
		</span>
		<span class="min-w-0 truncate text-sm font-medium text-slate-800">{name}</span>
	</li>
{/snippet}

{#snippet teamPanel(label: string, names: string[], team: 'A' | 'B')}
	<div
		class="overflow-hidden rounded-2xl border shadow-sm {team === 'A'
			? 'border-brand-200/80 bg-gradient-to-b from-brand-50/80 to-white'
			: 'border-slate-200 bg-gradient-to-b from-slate-50/80 to-white'}"
	>
		<div
			class="border-b px-3 py-2 text-center text-xs font-bold uppercase tracking-wide {team === 'A'
				? 'border-brand-100 bg-brand-100/50 text-brand-800'
				: 'border-slate-100 bg-slate-100/80 text-slate-700'}"
		>
			{label}
		</div>
		<ul class="space-y-2 p-3">
			{#each names as name, index (index)}
				{@render playerRow(name, team)}
			{/each}
		</ul>
	</div>
{/snippet}

{#if court}
	<AppModal open={open} labelledBy="court-detail-title" {onClose}>
		<div class="overflow-hidden rounded-2xl bg-white shadow-xl">
			<div class="border-b px-4 pb-5 pt-6 text-center {headerAccentClass}">
				<div class="mx-auto flex justify-center">
					<CourtIcon size="lg" />
				</div>
				<p class="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
					Court details
				</p>
				<h2 id="court-detail-title" class="mt-1 text-2xl font-bold tracking-tight text-slate-900">
					Court {court.courtNumber}
				</h2>
				<div class="mt-3 flex flex-wrap items-center justify-center gap-2">
					<span
						class="rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset {court.status
							? matchStatusBadgeClass(court.status)
							: 'bg-slate-100 text-slate-600 ring-slate-200'}"
					>
						{court.status ? matchStatusLabel(court.status) : courtGridStatusLabel(undefined)}
					</span>
				</div>
				{#if court.status === 'active' && court.score}
					<div
						class="mx-auto mt-4 inline-flex rounded-xl bg-white/90 px-4 py-2 shadow-sm ring-1 ring-emerald-200/80"
					>
						<p class="font-mono text-xl font-bold tabular-nums tracking-tight text-emerald-800">
							{court.score}
						</p>
					</div>
				{/if}
				{#if court.status === 'suspended'}
					<p class="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-rose-800/90">
						Score was rejected — review and enter the final result.
					</p>
				{/if}
			</div>

			<div class="space-y-4 bg-slate-50/50 p-4">
				{#if hasTeams}
					<div class="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
						{#if court.teamA?.length}
							{@render teamPanel('Team A', court.teamA, 'A')}
						{:else}
							<div></div>
						{/if}
						<span
							class="mt-10 rounded-full bg-white px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-slate-400 ring-1 ring-slate-200"
						>
							vs
						</span>
						{#if court.teamB?.length}
							{@render teamPanel('Team B', court.teamB, 'B')}
						{:else}
							<div></div>
						{/if}
					</div>
				{:else if court.players?.length}
					<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
						<div
							class="border-b border-slate-100 bg-slate-100/80 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-600"
						>
							Players
						</div>
						<ul class="space-y-2 p-3">
							{#each court.players as name, index (index)}
								{@render playerRow(name, 'neutral')}
							{/each}
						</ul>
					</div>
				{:else}
					<div class="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
						<p class="text-sm text-slate-500">No match on this court.</p>
					</div>
				{/if}
			</div>

			{#if action}
				<div class="border-t border-slate-100 bg-white px-4 py-4">
					{@render action()}
				</div>
			{/if}
		</div>
	</AppModal>
{/if}
