<script lang="ts">
	import { enhance } from '$app/forms';
	import FormToast from '@repo/ui/components/FormToast.svelte';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import RichTextDisplay from '@repo/ui/components/RichTextDisplay.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { formatBangkokWithZone } from '$lib/datetime/bangkok';
	import { formatThb } from '$lib/types/club';
	import {
		matchTypeLabel,
		sessionStatusBadgeClass,
		sessionStatusLabel
	} from '$lib/types/session';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let forceEndLoading = $state(false);
	let forceEndModalOpen = $state(false);

	const session = $derived(data.session);
	const toastMessage = $derived(form?.message ?? (data.created ? 'Session created.' : null));
	const toastVariant = $derived(form?.success || data.created ? 'success' : 'error');

	const handleForceEnd: SubmitFunction = () => {
		forceEndLoading = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			forceEndLoading = false;
			if (result.type === 'success') {
				forceEndModalOpen = false;
			}
		};
	};

	const detailRows = $derived([
		{ label: 'Club', value: session.club?.name ?? '—' },
		{ label: 'Host', value: session.host?.display_name ?? '—' },
		{ label: 'Status', value: sessionStatusLabel(session.status) },
		{ label: 'Start', value: formatBangkokWithZone(session.start_at) },
		{ label: 'End', value: formatBangkokWithZone(session.end_at) },
		{ label: 'Venue', value: session.venue_name ?? '—' },
		{
			label: 'Location',
			value:
				session.latitude !== null && session.longitude !== null
					? `${session.latitude.toFixed(5)}, ${session.longitude.toFixed(5)}`
					: '—'
		},
		{ label: 'Players', value: `${session.min_players} – ${session.max_players}` },
		{ label: 'Courts', value: String(session.court_count) },
		{ label: 'Court fee / hour', value: formatThb(session.court_fee_per_hour) },
		{
			label: 'Shuttle',
			value: session.shuttle
				? `${session.shuttle.name} (${formatThb(session.shuttle_price_per_each)} each in session)`
				: '—'
		},
		{ label: 'Match score', value: `${session.match_score_type} points` },
		{ label: 'Match type', value: matchTypeLabel(session.match_type) }
	]);
</script>

<FormToast message={toastMessage} variant={toastVariant} token={toastMessage ?? ''} />

<section class="space-y-6">
	<DashboardHero
		eyebrow="Session"
		title={session.name}
		subtitle={session.club?.name ?? 'Club session'}
	>
		<span class="rounded-full px-2 py-0.5 text-xs font-medium {sessionStatusBadgeClass(session.status)}">
			{sessionStatusLabel(session.status)}
		</span>
		{#if data.isHost}
			<span class="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
				You created this
			</span>
		{:else}
			<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
				Observation only
			</span>
		{/if}
	</DashboardHero>

	<AppCard class="space-y-4">
		<h2 class="text-lg font-semibold text-slate-900">Description</h2>
		<RichTextDisplay html={session.description} />
	</AppCard>

	<AppCard class="space-y-4">
		<h2 class="text-lg font-semibold text-slate-900">Session details</h2>
		<dl class="grid gap-3 sm:grid-cols-2">
			{#each detailRows as row (row.label)}
				<div class="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
					<dt class="text-xs font-medium uppercase tracking-wide text-slate-500">{row.label}</dt>
					<dd class="mt-1 text-sm font-medium text-slate-900">{row.value}</dd>
				</div>
			{/each}
		</dl>
	</AppCard>

	{#if data.isSuperAdmin && session.status !== 'closed' && session.status !== 'cancelled'}
		<AppCard class="space-y-4 border-red-200 bg-red-50/40">
			<div>
				<h2 class="text-lg font-semibold text-red-900">Danger zone</h2>
				<p class="mt-2 text-sm text-red-800">
					Force end this session immediately. Super admins only.
				</p>
			</div>
			<SubmitButton
				type="button"
				variant="ghost"
				class="!w-auto !text-red-700 hover:!bg-red-100"
				onclick={() => (forceEndModalOpen = true)}
			>
				Force end session
			</SubmitButton>
		</AppCard>
	{/if}
</section>

{#if forceEndModalOpen}
	<AppModal
		open={forceEndModalOpen}
		labelledBy="force-end-session-title"
		onClose={() => (forceEndModalOpen = false)}
	>
		<div class="overflow-hidden rounded-2xl bg-white shadow-xl">
			<div class="border-b border-red-100 bg-red-50 px-4 py-4">
				<h2 id="force-end-session-title" class="text-lg font-semibold text-red-900">
					Force end session?
				</h2>
				<p class="mt-2 text-sm text-red-800">
					This will set the session status to closed. Players and match flow are not updated in v1.
				</p>
			</div>
			<form
				method="POST"
				action="?/forceEnd"
				class="flex flex-wrap gap-2 p-4"
				use:enhance={handleForceEnd}
			>
				<SubmitButton loading={forceEndLoading} loadingLabel="Ending…" class="!w-auto">
					Force end session
				</SubmitButton>
				<SubmitButton
					type="button"
					variant="secondary"
					class="!w-auto"
					disabled={forceEndLoading}
					onclick={() => (forceEndModalOpen = false)}
				>
					Cancel
				</SubmitButton>
			</form>
		</div>
	</AppModal>
{/if}
