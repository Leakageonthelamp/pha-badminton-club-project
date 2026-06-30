<script lang="ts">
	import { enhance } from '$app/forms';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import MatchScoreDisplay from '@repo/ui/components/MatchScoreDisplay.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import {
		splitTeams
	} from '@repo/ui/matches';
	import type { MatchWithDetails } from '$lib/types/match';
	import type { SubmitFunction } from '@sveltejs/kit';

	let {
		open = false,
		match = null,
		userId = null,
		formAction,
		actionLoading = null,
		isBusy = false,
		handleAction
	}: {
		open?: boolean;
		match: MatchWithDetails | null;
		userId?: string | null;
		formAction: string;
		actionLoading?: string | null;
		isBusy?: boolean;
		handleAction: (key: string) => SubmitFunction;
	} = $props();

	const teams = $derived(match ? splitTeams(match.players) : { teamA: [], teamB: [] });
	const viewerTeam = $derived.by(() => {
		if (!match || !userId) return null;
		return match.players.find((player) => player.user_id === userId)?.team ?? null;
	});
	const teamAForDisplay = $derived(
		teams.teamA.map((player) => ({
			team: 'A' as const,
			displayName: player.profile?.display_name
		}))
	);
	const teamBForDisplay = $derived(
		teams.teamB.map((player) => ({
			team: 'B' as const,
			displayName: player.profile?.display_name
		}))
	);
	const submitterName = $derived.by(() => {
		if (!match?.score_submitted_by) return 'A teammate';
		const submitter = match.players.find((player) => player.user_id === match.score_submitted_by);
		return submitter?.profile?.display_name ?? 'A teammate';
	});
</script>

{#if match}
	<AppModal
		open={open}
		labelledBy="score-confirm-title"
		closeOnBackdrop={false}
		closeOnEscape={false}
	>
		<div class="overflow-hidden rounded-2xl bg-white shadow-xl">
			<div class="border-b border-sky-200 bg-gradient-to-br from-sky-50 via-white to-brand-50 px-4 py-5">
				<p class="text-xs font-semibold uppercase tracking-wide text-sky-700">Score check</p>
				<h2 id="score-confirm-title" class="mt-1 text-lg font-semibold text-slate-900">
					Confirm match result
				</h2>
				<p class="mt-2 text-sm leading-relaxed text-slate-600">
					<span class="font-medium text-slate-800">{submitterName}</span> logged this score for
					<span class="font-medium text-slate-800">court {match.court_number}</span>. Accept if it
					matches what you played — reject only if the numbers are wrong.
				</p>
			</div>

			<div class="p-4">
				{#if viewerTeam}
					<p class="mb-3 text-sm font-medium text-brand-800">
						Your team is highlighted on the scoreboard below.
					</p>
				{/if}
				<MatchScoreDisplay
					games={match.games}
					teamA={teamAForDisplay}
					teamB={teamBForDisplay}
					{viewerTeam}
					heading={null}
					embedded
				/>
			</div>

			<div class="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2">
				<form method="POST" action={formAction} use:enhance={handleAction('rejectScore')}>
					<input type="hidden" name="match_id" value={match.id} />
					<input type="hidden" name="accept" value="false" />
					<SubmitButton
						variant="secondary"
						loading={actionLoading === 'rejectScore'}
						loadingLabel="Rejecting…"
						disabled={isBusy && actionLoading !== 'rejectScore'}
						class="!w-full"
					>
						Reject score
					</SubmitButton>
				</form>
				<form method="POST" action={formAction} use:enhance={handleAction('acceptScore')}>
					<input type="hidden" name="match_id" value={match.id} />
					<input type="hidden" name="accept" value="true" />
					<SubmitButton
						loading={actionLoading === 'acceptScore'}
						loadingLabel="Accepting…"
						disabled={isBusy && actionLoading !== 'acceptScore'}
						class="!w-full"
					>
						Accept score
					</SubmitButton>
				</form>
			</div>
		</div>
	</AppModal>
{/if}
