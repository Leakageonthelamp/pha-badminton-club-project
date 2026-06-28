<script lang="ts">
	import { enhance } from '$app/forms';
	import NotSetBadge from '@repo/ui/components/NotSetBadge.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import SelectMenu from '@repo/ui/components/SelectMenu.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import DateTimePicker from '$lib/components/DateTimePicker.svelte';
	import MapPinPicker from '$lib/components/MapPinPicker.svelte';
	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
	import { clubWorkspaceState } from '$lib/clubWorkspace.svelte';
	import {
		addHoursToLocalInput,
		localInputToDate,
		localInputToUtcSafe,
		utcToLocalInput
	} from '@repo/ui/datetime';
	import { SESSION_MIN_START_LEAD_MINUTES, SESSION_NAME_MAX_LENGTH } from '$lib/config/session';
	import { whileSubmitting } from '$lib/forms/submitting';
	import type { Club } from '$lib/types/club';
	import { formatThb, shuttlePricePerEach } from '$lib/types/club';
	import type { SessionDetail } from '$lib/types/session';

	type ShuttleOption = {
		id: string;
		club_id: string;
		name: string;
		speed: 75 | 76;
		price: number;
		number_per_box: number;
	};

	let {
		mode,
		managedClubs,
		shuttles,
		session = null,
		submitLabel,
		loadingLabel
	}: {
		mode: 'create' | 'edit';
		managedClubs: Club[];
		shuttles: ShuttleOption[];
		session?: SessionDetail | null;
		submitLabel: string;
		loadingLabel: string;
	} = $props();

	const editClub = $derived(
		mode === 'edit' && session
			? (managedClubs.find((club) => club.id === session.club_id) ?? null)
			: null
	);

	const sessionMatchesClubVenue = (club: Club, value: SessionDetail): boolean =>
		(value.venue_name ?? '') === (club.venue_name ?? '') &&
		value.latitude === club.latitude &&
		value.longitude === club.longitude;

	const initialEditClub =
		mode === 'edit' && session
			? (managedClubs.find((club) => club.id === session.club_id) ?? null)
			: null;

	let loading = $state(false);
	let name = $state(mode === 'edit' && session ? session.name : '');
	let description = $state(mode === 'edit' && session ? session.description : '');
	let startAtLocal = $state(
		mode === 'edit' && session ? utcToLocalInput(session.start_at) : ''
	);
	let endAtLocal = $state(mode === 'edit' && session ? utcToLocalInput(session.end_at) : '');
	let venueName = $state(mode === 'edit' && session ? (session.venue_name ?? '') : '');
	let latitude = $state<number | null>(
		mode === 'edit' && session ? session.latitude : null
	);
	let longitude = $state<number | null>(
		mode === 'edit' && session ? session.longitude : null
	);
	let maxPlayers = $state(mode === 'edit' && session ? String(session.max_players) : '');
	let minPlayers = $state(mode === 'edit' && session ? String(session.min_players) : '');
	let courtCount = $state(mode === 'edit' && session ? String(session.court_count) : '');
	let courtFeePerHour = $state(
		mode === 'edit' && session ? String(session.court_fee_per_hour) : ''
	);
	let shuttleId = $state(mode === 'edit' && session ? (session.shuttle_id ?? '') : '');
	let shuttlePricePerEachValue = $state(
		mode === 'edit' && session ? String(session.shuttle_price_per_each) : ''
	);
	let matchScoreType = $state(
		mode === 'edit' && session ? String(session.match_score_type) : '21'
	);
	let matchType = $state(
		mode === 'edit' && session ? session.match_type : 'one_round'
	);
	let cancellationFee = $state(
		mode === 'edit' && session ? String(session.cancellation_fee) : '0'
	);
	let maxBuffer = $state(mode === 'edit' && session ? String(session.max_buffer) : '0');
	let syncedClubId = $state('');
	let venueEditing = $state(
		mode === 'edit' && session && initialEditClub
			? !sessionMatchesClubVenue(initialEditClub, session)
			: false
	);

	const activeClub = $derived(
		mode === 'edit'
			? editClub
			: (managedClubs.find((club) => club.id === clubWorkspaceState.selectedClubId) ??
					managedClubs[0] ??
					null)
	);
	const clubShuttles = $derived(
		activeClub ? shuttles.filter((shuttle) => shuttle.club_id === activeClub.id) : []
	);

	const inputClass =
		'w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20';
	const labelClass = 'mb-2 block text-sm font-medium text-slate-700';
	const formSectionClass = 'space-y-4 py-6 first:pt-0 last:pb-0';

	const shuttleOptions = $derived(
		clubShuttles.map((shuttle) => ({
			value: shuttle.id,
			label: `${shuttle.name} ${shuttle.speed} (${formatThb(shuttlePricePerEach(shuttle))} each)`
		}))
	);

	const selectedShuttle = $derived(
		clubShuttles.find((shuttle) => shuttle.id === shuttleId) ?? null
	);

	const hasClubVenueDefaults = $derived(
		activeClub
			? Boolean(
					activeClub.venue_name?.trim() &&
						activeClub.latitude !== null &&
						activeClub.longitude !== null
				)
			: false
	);
	const venueLocked = $derived(hasClubVenueDefaults && !venueEditing);

	const startAtUtc = $derived(startAtLocal ? localInputToUtcSafe(startAtLocal) : '');
	const endAtUtc = $derived(endAtLocal ? localInputToUtcSafe(endAtLocal) : '');
	const endMinLocal = $derived(
		startAtLocal ? (addHoursToLocalInput(startAtLocal, 1) ?? undefined) : undefined
	);

	$effect(() => {
		if (!startAtLocal) {
			if (endAtLocal) endAtLocal = '';
			return;
		}

		if (!endAtLocal || !endMinLocal) return;

		const endDate = localInputToDate(endAtLocal);
		const minEndDate = localInputToDate(endMinLocal);
		if (endDate && minEndDate && endDate < minEndDate) {
			endAtLocal = '';
		}
	});

	const applyShuttleDefaultPrice = () => {
		if (selectedShuttle) {
			shuttlePricePerEachValue = String(shuttlePricePerEach(selectedShuttle));
		}
	};

	const useClubVenueDefaults = () => {
		if (!activeClub) return;

		venueName = activeClub.venue_name ?? '';
		latitude = activeClub.latitude;
		longitude = activeClub.longitude;
		venueEditing = false;
	};

	$effect.pre(() => {
		if (mode !== 'create') return;

		const club = activeClub;
		if (!club || club.id === syncedClubId) return;

		syncedClubId = club.id;
		venueEditing = false;
		venueName = club.venue_name ?? '';
		latitude = club.latitude;
		longitude = club.longitude;
		shuttleId = clubShuttles[0]?.id ?? '';
		shuttlePricePerEachValue = clubShuttles[0]
			? String(shuttlePricePerEach(clubShuttles[0]))
			: '';
	});
</script>

<form method="POST" class="divide-y divide-slate-200" use:enhance={whileSubmitting((v) => (loading = v))}>
	{#if activeClub}
		<input type="hidden" name="club_id" value={activeClub.id} />
	{/if}

	{#if managedClubs.length > 1 && activeClub}
		<div class={formSectionClass}>
			<SectionHeading title="Club" />
			<div>
				<input
					id="club_name"
					type="text"
					value={activeClub.name}
					disabled
					aria-label="Club"
					class="{inputClass} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-700"
				/>
				{#if mode === 'create'}
					<p class="mt-2 text-xs text-slate-500">
						Use the club switcher in the navbar to create a session for a different club.
					</p>
				{/if}
			</div>
		</div>
	{/if}

	<div class={formSectionClass}>
		<SectionHeading title="Session details" />
		<div>
			<label for="name" class={labelClass}>Session name</label>
			<input
				id="name"
				name="name"
				type="text"
				required
				maxlength={SESSION_NAME_MAX_LENGTH}
				bind:value={name}
				class={inputClass}
				placeholder="Friday Night Smash"
			/>
		</div>

		<RichTextEditor name="description" bind:value={description} disabled={loading} />
	</div>

	<div class={formSectionClass}>
		<SectionHeading title="Schedule" />
		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<DateTimePicker
					id="start_at_local"
					label="Start"
					required
					minNow
					minOffsetMinutes={mode === 'create' ? SESSION_MIN_START_LEAD_MINUTES : 0}
					placeholder="dd/mm/yyyy, --:--"
					bind:value={startAtLocal}
				/>
				<input type="hidden" name="start_at" value={startAtUtc} />
			</div>
			<div>
				<DateTimePicker
					id="end_at_local"
					label="End"
					required
					disabled={!startAtLocal}
					min={endMinLocal}
					placeholder="dd/mm/yyyy, --:--"
					bind:value={endAtLocal}
				/>
				<input type="hidden" name="end_at" value={endAtUtc} />
			</div>
		</div>
		<p class="text-xs text-slate-500">
			Times use your device's timezone. Minimum session length is 1 hour.
		</p>
	</div>

	<div class={formSectionClass}>
		<div class="flex flex-wrap items-center gap-2">
			<SectionHeading title="Venue" />
			{#if activeClub && !hasClubVenueDefaults}
				<NotSetBadge />
			{/if}
		</div>

		{#if hasClubVenueDefaults}
			<div
				class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
			>
				<p class="text-sm text-slate-600">
					{#if venueLocked}
						Using your club's default venue ({activeClub?.venue_name}). Edit to set a different
						venue for this session.
					{:else}
						Custom venue for this session.
					{/if}
				</p>
				{#if venueLocked}
					<SubmitButton
						type="button"
						variant="secondary"
						class="!w-auto shrink-0 !py-2 !text-sm"
						disabled={loading}
						onclick={() => (venueEditing = true)}
					>
						Edit
					</SubmitButton>
				{:else}
					<SubmitButton
						type="button"
						variant="secondary"
						class="!w-auto shrink-0 !py-2 !text-sm"
						disabled={loading}
						onclick={useClubVenueDefaults}
					>
						Use club default
					</SubmitButton>
				{/if}
			</div>
		{:else if activeClub}
			<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
				<p class="text-sm text-amber-900">
					This club has no default venue in settings. Enter the venue for this session below, or
					<a
						href="/clubs/{activeClub.id}"
						class="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
					>
						set a club default
					</a>
					so future sessions pre-fill automatically.
				</p>
			</div>
		{/if}

		<div>
			<label for="venue_name" class={labelClass}>Venue name</label>
			<input type="hidden" name="venue_name" value={venueName} />
			<input
				id="venue_name"
				type="text"
				required
				bind:value={venueName}
				disabled={venueLocked || loading}
				placeholder={hasClubVenueDefaults ? undefined : 'e.g. Rama IX Sports Center'}
				class="{inputClass} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-700"
			/>
		</div>

		<div class="space-y-2">
			<p class={labelClass}>Venue location</p>
			<MapPinPicker
				bind:latitude
				bind:longitude
				locked={venueLocked}
				hideLockedHint={hasClubVenueDefaults}
				disabled={loading}
			/>
			<input type="hidden" name="latitude" value={latitude ?? ''} />
			<input type="hidden" name="longitude" value={longitude ?? ''} />
		</div>
	</div>

	<div class={formSectionClass}>
		<SectionHeading title="Players & courts" />
		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label for="max_players" class={labelClass}>Max players</label>
				<input
					id="max_players"
					name="max_players"
					type="number"
					min="1"
					required
					bind:value={maxPlayers}
					placeholder="12"
					class={inputClass}
				/>
			</div>
			<div>
				<label for="min_players" class={labelClass}>Min players</label>
				<input
					id="min_players"
					name="min_players"
					type="number"
					min="1"
					required
					bind:value={minPlayers}
					placeholder="4"
					class={inputClass}
				/>
			</div>
			<div>
				<label for="court_count" class={labelClass}>Court count</label>
				<input
					id="court_count"
					name="court_count"
					type="number"
					min="1"
					required
					bind:value={courtCount}
					placeholder="2"
					class={inputClass}
				/>
			</div>
			<div>
				<label for="court_fee_per_hour" class={labelClass}>Court fee per hour (THB)</label>
				<input
					id="court_fee_per_hour"
					name="court_fee_per_hour"
					type="number"
					min="0"
					step="0.01"
					required
					bind:value={courtFeePerHour}
					placeholder="200"
					class={inputClass}
				/>
			</div>
		</div>
	</div>

	<div class={formSectionClass}>
		<SectionHeading title="Shuttle & pricing" />
		<div class="space-y-4">
			{#if shuttleOptions.length === 0}
				<p class="text-sm text-amber-700">
					Add shuttlecocks in club settings before {mode === 'create' ? 'creating' : 'editing'} a
					session.
				</p>
			{:else}
				<SelectMenu
					id="shuttle_id"
					label="Shuttle"
					options={shuttleOptions}
					truncate={false}
					bind:value={shuttleId}
					onchange={() => applyShuttleDefaultPrice()}
				/>
				<input type="hidden" name="shuttle_id" value={shuttleId} />
				<div class="max-w-md">
					<label for="shuttle_price_per_each" class={labelClass}>Shuttle price per each (THB)</label>
					<input
						id="shuttle_price_per_each"
						name="shuttle_price_per_each"
						type="number"
						min="0"
						step="0.01"
						required
						bind:value={shuttlePricePerEachValue}
						class={inputClass}
					/>
					{#if selectedShuttle}
						<p class="mt-2 text-xs text-slate-500">
							Club default: {formatThb(shuttlePricePerEach(selectedShuttle))} each
						</p>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<div class={formSectionClass}>
		<SectionHeading title="Join settings" />
		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label for="max_buffer" class={labelClass}>Max buffer queue</label>
				<input
					id="max_buffer"
					name="max_buffer"
					type="number"
					min="0"
					required
					bind:value={maxBuffer}
					placeholder="0"
					class={inputClass}
				/>
				<p class="mt-1 text-xs text-slate-500">
					Overflow slots when the waiting list is full. Queue players can cancel anytime without
					fee.
				</p>
			</div>
			<div>
				<label for="cancellation_fee" class={labelClass}>Late cancel fee (THB)</label>
				<input
					id="cancellation_fee"
					name="cancellation_fee"
					type="number"
					min="0"
					step="0.01"
					required
					bind:value={cancellationFee}
					placeholder="0"
					class={inputClass}
				/>
				<p class="mt-1 text-xs text-slate-500">
					Charged when a waiting player cancels within 1 hour of start (recorded, not collected
					yet).
				</p>
			</div>
		</div>
	</div>

	<div class={formSectionClass}>
		<SectionHeading title="Match settings" />
		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<SelectMenu
					id="match_score_type"
					label="Match score type"
					options={[
						{ value: '15', label: '15 points' },
						{ value: '21', label: '21 points' }
					]}
					bind:value={matchScoreType}
				/>
				<input type="hidden" name="match_score_type" value={matchScoreType} />
			</div>
			<div>
				<SelectMenu
					id="match_type"
					label="Match type"
					options={[
						{ value: 'one_round', label: 'One round' },
						{ value: 'two_round', label: 'Two rounds' }
					]}
					bind:value={matchType}
				/>
				<input type="hidden" name="match_type" value={matchType} />
			</div>
		</div>
	</div>

	<div class={formSectionClass}>
		{#if mode === 'edit' && session?.status === 'open'}
			<p class="mb-4 text-sm text-amber-800">
				Saving changes will return this session to draft and release all waiting and queued
				players. Open it again when ready.
			</p>
		{/if}
		<SubmitButton
			loading={loading}
			{loadingLabel}
			disabled={!activeClub || clubShuttles.length === 0}
		>
			{submitLabel}
		</SubmitButton>
	</div>
</form>
