<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import FormToast from '@repo/ui/components/FormToast.svelte';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import RichTextDisplay from '@repo/ui/components/RichTextDisplay.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import BuildingIcon from '@repo/ui/icons/BuildingIcon.svelte';
	import LayersIcon from '@repo/ui/icons/LayersIcon.svelte';
	import SettingsIcon from '@repo/ui/icons/SettingsIcon.svelte';
	import UserIcon from '@repo/ui/icons/UserIcon.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { formatDateTime } from '@repo/ui/datetime';
	import { formatThb } from '$lib/types/club';
	import {
		matchTypeLabel,
		sessionPlayerStatusLabel,
		sessionStatusBadgeClass,
		sessionStatusLabel
	} from '$lib/types/session';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let forceEndLoading = $state(false);
	let forceEndModalOpen = $state(false);
	let openLoading = $state(false);
	let openModalOpen = $state(false);
	let cancelLoading = $state(false);
	let cancelModalOpen = $state(false);
	let playerActionLoading = $state<string | null>(null);

	const session = $derived(data.session);
	const waitingPlayers = $derived(data.players.filter((p) => p.status === 'waiting'));
	const queuedPlayers = $derived(data.players.filter((p) => p.status === 'queued'));
	const confirmedPlayers = $derived(data.players.filter((p) => p.status === 'confirmed'));
	const toastMessage = $derived(
		form?.message ??
			(data.edited
				? 'Session updated and returned to draft. Open it again when ready.'
				: data.created
					? 'Session created.'
					: null)
	);
	const toastVariant = $derived(form?.success || data.created || data.edited ? 'success' : 'error');

	const sessionDurationLabel = $derived.by(() => {
		const start = new Date(session.start_at);
		const end = new Date(session.end_at);
		const ms = end.getTime() - start.getTime();
		if (ms <= 0) return '—';

		const totalMinutes = Math.round(ms / 60_000);
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;

		if (minutes === 0) return `${hours} hr`;
		if (hours === 0) return `${minutes} min`;
		return `${hours} hr ${minutes} min`;
	});

	const locationLabel = $derived(
		session.latitude !== null && session.longitude !== null
			? `${session.latitude.toFixed(5)}, ${session.longitude.toFixed(5)}`
			: null
	);

	const mapsUrl = $derived(
		session.latitude !== null && session.longitude !== null
			? `https://www.google.com/maps?q=${session.latitude},${session.longitude}`
			: null
	);

	const shuttleLabel = $derived(
		session.shuttle
			? `${session.shuttle.name} · ${formatThb(session.shuttle_price_per_each)} each`
			: '—'
	);

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

	const handleOpenSession: SubmitFunction = () => {
		openLoading = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			openLoading = false;
			if (result.type === 'success') {
				openModalOpen = false;
			}
		};
	};

	const handleCancelSession: SubmitFunction = () => {
		cancelLoading = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			cancelLoading = false;
			if (result.type === 'success') {
				cancelModalOpen = false;
			}
		};
	};

	const handlePlayerAction =
		(playerId: string): SubmitFunction =>
		() => {
			playerActionLoading = playerId;
			return async ({ result, update }) => {
				await update({ reset: false });
				playerActionLoading = null;
			};
		};

	const showParticipantsAtTop = $derived(session.status === 'open');
</script>

{#snippet participantsSection()}
	{#if data.canManage && session.status !== 'draft'}
		<AppCard class="space-y-6">
			<div>
				<h2 class="text-lg font-semibold text-slate-900">Participants</h2>
				<p class="mt-1 text-sm text-slate-600">
					Confirm or reject waiting players from 15 minutes before start until session end.
				</p>
				{#if !data.adminActionWindowOpen}
					<p class="mt-2 text-sm text-amber-800">
						Confirm/reject actions open 15 minutes before the session starts.
					</p>
				{/if}
			</div>

			<div class="space-y-3">
				<h3 class="app-section-heading">
					Waiting list ({waitingPlayers.length})
				</h3>
				{#if waitingPlayers.length === 0}
					<p class="text-sm text-slate-500">No players waiting.</p>
				{:else}
					<ul class="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
						{#each waitingPlayers as player (player.id)}
							<li class="flex flex-wrap items-center gap-3 bg-white px-4 py-3">
								<UserAvatar
									displayName={player.profile?.display_name ?? 'Player'}
									avatarUrl={player.profile?.avatar_url ?? null}
									size="sm"
								/>
								<div class="min-w-0 flex-1">
									<p class="truncate font-medium text-slate-900">
										{player.profile?.display_name ?? 'Unknown'}
									</p>
									<p class="text-xs text-slate-500">
										{sessionPlayerStatusLabel(player.status)} · joined {formatDateTime(player.joined_at)}
									</p>
								</div>
								{#if player.profile?.tag}
									<TagPill tag={player.profile.tag} />
								{/if}
								{#if data.adminActionWindowOpen}
									<div class="flex w-full gap-2 sm:ml-auto sm:w-auto">
										<form method="POST" action="?/confirm" use:enhance={handlePlayerAction(player.id)}>
											<input type="hidden" name="session_id" value={session.id} />
											<input type="hidden" name="player_id" value={player.id} />
											<SubmitButton
												class="!w-auto"
												loading={playerActionLoading === player.id}
												loadingLabel="…"
											>
												Confirm
											</SubmitButton>
										</form>
										<form method="POST" action="?/reject" use:enhance={handlePlayerAction(player.id)}>
											<input type="hidden" name="session_id" value={session.id} />
											<input type="hidden" name="player_id" value={player.id} />
											<SubmitButton
												variant="secondary"
												class="!w-auto"
												loading={playerActionLoading === player.id}
												loadingLabel="…"
											>
												Reject
											</SubmitButton>
										</form>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="space-y-3">
				<h3 class="app-section-heading">Buffer queue ({queuedPlayers.length}/{session.max_buffer})</h3>
				{#if queuedPlayers.length === 0}
					<p class="text-sm text-slate-500">No players in the buffer queue.</p>
				{:else}
					<ul class="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
						{#each queuedPlayers as player (player.id)}
							<li class="flex items-center gap-3 bg-white px-4 py-3">
								<UserAvatar
									displayName={player.profile?.display_name ?? 'Player'}
									avatarUrl={player.profile?.avatar_url ?? null}
									size="sm"
								/>
								<div class="min-w-0 flex-1">
									<p class="truncate font-medium text-slate-900">
										{player.profile?.display_name ?? 'Unknown'}
									</p>
									<p class="text-xs text-slate-500">
										{sessionPlayerStatusLabel(player.status)} · joined {formatDateTime(player.joined_at)}
									</p>
								</div>
								{#if player.profile?.tag}
									<TagPill tag={player.profile.tag} />
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="space-y-3">
				<h3 class="app-section-heading">Confirmed ({confirmedPlayers.length})</h3>
				{#if confirmedPlayers.length === 0}
					<p class="text-sm text-slate-500">No confirmed players yet.</p>
				{:else}
					<ul class="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
						{#each confirmedPlayers as player (player.id)}
							<li class="flex items-center gap-3 bg-white px-4 py-3">
								<UserAvatar
									displayName={player.profile?.display_name ?? 'Player'}
									avatarUrl={player.profile?.avatar_url ?? null}
									size="sm"
								/>
								<div class="min-w-0 flex-1">
									<p class="truncate font-medium text-slate-900">
										{player.profile?.display_name ?? 'Unknown'}
									</p>
									<p class="text-xs text-slate-500">
										Confirmed {player.decided_at ? formatDateTime(player.decided_at) : '—'}
									</p>
								</div>
								{#if player.profile?.tag}
									<TagPill tag={player.profile.tag} />
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</AppCard>
	{/if}
{/snippet}

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

	{#if session.status === 'draft'}
		<AppCard class="space-y-4 border-amber-200 bg-amber-50/60">
			<div>
				<h2 class="text-lg font-semibold text-amber-900">Draft session</h2>
				<p class="mt-2 text-sm text-amber-800">
					This session is hidden from players until you open it. Open by
					{formatDateTime(data.draftOpenDeadline)} (1 hour before start) or it will be
					auto-cancelled.
				</p>
			</div>
			{#if data.canOpen}
				<SubmitButton
					type="button"
					class="!w-auto"
					onclick={() => (openModalOpen = true)}
				>
					Open session
				</SubmitButton>
			{:else if data.canManage}
				<p class="text-sm text-amber-800">The open window has passed.</p>
			{/if}
		</AppCard>
	{/if}

	{#if data.canModify}
		<AppCard class="space-y-4">
			<div>
				<h2 class="text-lg font-semibold text-slate-900">Manage session</h2>
				<p class="mt-1 text-sm text-slate-600">
					Edit or cancel until 15 minutes before start. After that, changes are locked.
				</p>
			</div>
			<div class="flex flex-wrap gap-2">
				<SubmitButton
					type="button"
					variant="secondary"
					class="!w-auto"
					onclick={() => goto(`/sessions/${session.id}/edit`)}
				>
					Edit session
				</SubmitButton>
				<SubmitButton
					type="button"
					variant="ghost"
					class="!w-auto !text-red-700 hover:!bg-red-50"
					onclick={() => (cancelModalOpen = true)}
				>
					Cancel session
				</SubmitButton>
			</div>
		</AppCard>
	{/if}

	{#if showParticipantsAtTop}
		{@render participantsSection()}
	{/if}

	<AppCard class="space-y-4">
		<h2 class="text-lg font-semibold text-slate-900">Description</h2>
		<RichTextDisplay html={session.description} />
	</AppCard>

	<section class="app-detail-section">
		<div
			class="grid gap-4 border-b border-brand-100 bg-gradient-to-br from-brand-50 via-white to-brand-50/50 px-4 py-5 sm:grid-cols-[1fr_auto_1fr_auto_1fr]"
		>
			<div>
				<p class="text-xs font-semibold uppercase tracking-wide text-brand-600">Start</p>
				<p class="mt-1 text-base font-semibold text-slate-900">{formatDateTime(session.start_at)}</p>
			</div>
			<div class="hidden self-center sm:block" aria-hidden="true">
				<div class="h-10 w-px bg-brand-200"></div>
			</div>
			<div class="rounded-2xl border border-brand-100 bg-white/80 px-4 py-3 shadow-sm ring-1 ring-brand-100/80">
				<p class="text-xs font-semibold uppercase tracking-wide text-brand-600">Duration</p>
				<p class="mt-1 text-lg font-semibold text-brand-800">{sessionDurationLabel}</p>
			</div>
			<div class="hidden self-center sm:block" aria-hidden="true">
				<div class="h-10 w-px bg-brand-200"></div>
			</div>
			<div class="sm:text-right">
				<p class="text-xs font-semibold uppercase tracking-wide text-brand-600">End</p>
				<p class="mt-1 text-base font-semibold text-slate-900">{formatDateTime(session.end_at)}</p>
			</div>
		</div>

		<div class="app-detail-section-body space-y-6">
			<div class="app-detail-section-header">
				<span class="app-detail-section-icon" aria-hidden="true">
					<LayersIcon class="h-5 w-5" />
				</span>
				<div>
					<h2 class="text-lg font-semibold text-slate-900">Session details</h2>
					<p class="text-sm text-slate-500">Overview, venue, capacity, and match settings</p>
				</div>
			</div>

			<div class="space-y-3">
				<h3 class="app-section-heading">Overview</h3>
				<dl class="app-detail-contact-grid">
					<div class="app-detail-contact-item">
						<dt class="app-detail-contact-label">
							<span class="inline-flex items-center gap-1.5">
								<BuildingIcon class="h-4 w-4 text-brand-500" />
								Club
							</span>
						</dt>
						<dd class="app-detail-contact-value">{session.club?.name ?? '—'}</dd>
					</div>
					<div class="app-detail-contact-item">
						<dt class="app-detail-contact-label">
							<span class="inline-flex items-center gap-1.5">
								<UserIcon class="h-4 w-4 text-brand-500" />
								Host
							</span>
						</dt>
						<dd class="app-detail-contact-value">{session.host?.display_name ?? '—'}</dd>
					</div>
					<div class="app-detail-contact-item sm:col-span-2">
						<dt class="app-detail-contact-label">Status</dt>
						<dd class="app-detail-contact-value">
							<span
								class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold {sessionStatusBadgeClass(
									session.status
								)}"
							>
								{sessionStatusLabel(session.status)}
							</span>
						</dd>
					</div>
				</dl>
			</div>

			<div class="space-y-3">
				<h3 class="app-section-heading">Venue</h3>
				<dl class="app-detail-contact-grid">
					<div class="app-detail-contact-item app-detail-contact-item--wide">
						<dt class="app-detail-contact-label">Venue name</dt>
						<dd class="app-detail-contact-value text-base">{session.venue_name ?? '—'}</dd>
					</div>
					<div class="app-detail-contact-item app-detail-contact-item--wide">
						<dt class="app-detail-contact-label">Map coordinates</dt>
						<dd class="app-detail-contact-value">
							{#if locationLabel && mapsUrl}
								<a
									href={mapsUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="font-mono text-sm text-brand-700 underline decoration-brand-200 underline-offset-2 hover:text-brand-800"
								>
									{locationLabel}
								</a>
								<span class="text-xs text-slate-500">Open in Maps</span>
							{:else}
								<span class="text-slate-500">—</span>
							{/if}
						</dd>
					</div>
				</dl>
			</div>

			<div class="space-y-3">
				<h3 class="app-section-heading">Capacity & pricing</h3>
				<dl class="app-detail-meta-grid">
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">Players</dt>
						<dd class="app-detail-meta-value">
							<span class="text-lg font-semibold text-brand-700">{session.min_players}</span>
							<span class="text-slate-400"> – </span>
							<span class="text-lg font-semibold text-brand-700">{session.max_players}</span>
							<span class="ml-1 text-xs font-normal text-slate-500">min – max</span>
						</dd>
					</div>
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">Courts</dt>
						<dd class="app-detail-meta-value">
							<span class="text-lg font-semibold text-brand-700">{session.court_count}</span>
						</dd>
					</div>
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">Court fee / hour</dt>
						<dd class="app-detail-meta-value text-base text-brand-800">
							{formatThb(session.court_fee_per_hour)}
						</dd>
					</div>
					<div class="app-detail-meta-item sm:col-span-2">
						<dt class="app-detail-meta-label">Shuttle</dt>
						<dd class="app-detail-meta-value">{shuttleLabel}</dd>
					</div>
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">Buffer queue</dt>
						<dd class="app-detail-meta-value">
							<span class="text-lg font-semibold text-brand-700">{session.max_buffer}</span>
							<span class="ml-1 text-xs font-normal text-slate-500">max overflow</span>
						</dd>
					</div>
					<div class="app-detail-meta-item">
						<dt class="app-detail-meta-label">Late cancel fee</dt>
						<dd class="app-detail-meta-value text-base text-brand-800">
							{formatThb(session.cancellation_fee)}
						</dd>
					</div>
				</dl>
			</div>

			<div class="space-y-3">
				<h3 class="app-section-heading">Match settings</h3>
				<dl class="app-detail-contact-grid">
					<div class="app-detail-contact-item">
						<dt class="app-detail-contact-label">
							<span class="inline-flex items-center gap-1.5">
								<SettingsIcon class="h-4 w-4 text-brand-500" />
								Match score
							</span>
						</dt>
						<dd class="app-detail-contact-value">{session.match_score_type} points</dd>
					</div>
					<div class="app-detail-contact-item">
						<dt class="app-detail-contact-label">
							<span class="inline-flex items-center gap-1.5">
								<SettingsIcon class="h-4 w-4 text-brand-500" />
								Match type
							</span>
						</dt>
						<dd class="app-detail-contact-value">{matchTypeLabel(session.match_type)}</dd>
					</div>
				</dl>
			</div>
		</div>
	</section>

	{#if !showParticipantsAtTop}
		{@render participantsSection()}
	{/if}

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

{#if openModalOpen}
	<AppModal
		open={openModalOpen}
		labelledBy="open-session-title"
		onClose={() => (openModalOpen = false)}
	>
		<div class="overflow-hidden rounded-2xl bg-white shadow-xl">
			<div class="border-b border-brand-100 bg-brand-50 px-4 py-4">
				<h2 id="open-session-title" class="text-lg font-semibold text-brand-900">
					Open session?
				</h2>
				<p class="mt-2 text-sm text-brand-800">
					Players will be able to discover and join this session once it is open.
				</p>
			</div>
			<form
				method="POST"
				action="?/openSession"
				class="flex flex-wrap gap-2 p-4"
				use:enhance={handleOpenSession}
			>
				<SubmitButton loading={openLoading} loadingLabel="Opening…" class="!w-auto">
					Open session
				</SubmitButton>
				<SubmitButton
					type="button"
					variant="secondary"
					class="!w-auto"
					disabled={openLoading}
					onclick={() => (openModalOpen = false)}
				>
					Cancel
				</SubmitButton>
			</form>
		</div>
	</AppModal>
{/if}

{#if cancelModalOpen}
	<AppModal
		open={cancelModalOpen}
		labelledBy="cancel-session-title"
		onClose={() => (cancelModalOpen = false)}
	>
		<div class="overflow-hidden rounded-2xl bg-white shadow-xl">
			<div class="border-b border-red-100 bg-red-50 px-4 py-4">
				<h2 id="cancel-session-title" class="text-lg font-semibold text-red-900">
					Cancel session?
				</h2>
				<p class="mt-2 text-sm text-red-800">
					This will cancel the session and release all waiting and queued players without a fee.
				</p>
			</div>
			<form
				method="POST"
				action="?/cancel"
				class="flex flex-wrap gap-2 p-4"
				use:enhance={handleCancelSession}
			>
				<SubmitButton loading={cancelLoading} loadingLabel="Cancelling…" class="!w-auto">
					Cancel session
				</SubmitButton>
				<SubmitButton
					type="button"
					variant="secondary"
					class="!w-auto"
					disabled={cancelLoading}
					onclick={() => (cancelModalOpen = false)}
				>
					Keep session
				</SubmitButton>
			</form>
		</div>
	</AppModal>
{/if}
