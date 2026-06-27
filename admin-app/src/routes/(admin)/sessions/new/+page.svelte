<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import FormToast from '@repo/ui/components/FormToast.svelte';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import SelectMenu from '@repo/ui/components/SelectMenu.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import MapPinPicker from '$lib/components/MapPinPicker.svelte';
	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
	import { SESSION_NAME_MAX_LENGTH } from '$lib/config/session';
	import { whileSubmitting } from '$lib/forms/submitting';
	import { formatThb, shuttlePricePerEach } from '$lib/types/club';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let loading = $state(false);
	let name = $state('');
	let description = $state('');
	let startAtLocal = $state('');
	let endAtLocal = $state('');
	let venueName = $state('');
	let latitude = $state<number | null>(null);
	let longitude = $state<number | null>(null);
	let maxPlayers = $state('12');
	let minPlayers = $state('4');
	let courtCount = $state('2');
	let courtFeePerHour = $state('200');
	let shuttleId = $state('');
	let shuttlePricePerEachValue = $state('');
	let matchScoreType = $state('21');
	let matchType = $state('one_round');
	let selectedClubId = $state('');

	const inputClass =
		'w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20';
	const labelClass = 'mb-2 block text-sm font-medium text-slate-700';

	const shuttleOptions = $derived(
		data.shuttles.map((shuttle) => ({
			value: shuttle.id,
			label: `${shuttle.name} ${shuttle.speed} (${formatThb(shuttlePricePerEach(shuttle))} each)`
		}))
	);

	const selectedShuttle = $derived(data.shuttles.find((shuttle) => shuttle.id === shuttleId) ?? null);

	$effect.pre(() => {
		if (selectedShuttle && !shuttlePricePerEachValue) {
			shuttlePricePerEachValue = String(shuttlePricePerEach(selectedShuttle));
		}
	});

	const applyShuttleDefaultPrice = () => {
		if (selectedShuttle) {
			shuttlePricePerEachValue = String(shuttlePricePerEach(selectedShuttle));
		}
	};

	async function handleClubChange(clubId: string) {
		selectedClubId = clubId;
		await goto(`/sessions/new?club_id=${encodeURIComponent(clubId)}`, { replaceState: true });
	}

	$effect.pre(() => {
		selectedClubId = data.activeClub.id;
		venueName = data.activeClub.venue_name ?? '';
		latitude = data.activeClub.latitude;
		longitude = data.activeClub.longitude;
		shuttleId = data.shuttles[0]?.id ?? '';
		shuttlePricePerEachValue = data.shuttles[0]
			? String(shuttlePricePerEach(data.shuttles[0]))
			: '';
	});
</script>

<FormToast message={form?.message} variant="error" token={form?.message ?? ''} />

<section class="space-y-6">
	<DashboardHero
		title="Create session"
		subtitle="Schedule a new badminton session for {data.activeClub.name}."
	/>

	<AppCard class="space-y-4">
		<form method="POST" class="space-y-6" use:enhance={whileSubmitting((v) => (loading = v))}>
			<input type="hidden" name="club_id" value={selectedClubId} />

			{#if data.managedClubs.length > 1}
				<div>
					<SelectMenu
						id="club_id_select"
						label="Club"
						options={data.managedClubs.map((club) => ({ value: club.id, label: club.name }))}
						value={selectedClubId}
						onchange={(value) => handleClubChange(value)}
					/>
				</div>
			{/if}

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

			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label for="start_at_local" class={labelClass}>Start (Bangkok)</label>
					<input
						id="start_at_local"
						name="start_at_local"
						type="datetime-local"
						required
						bind:value={startAtLocal}
						class={inputClass}
					/>
				</div>
				<div>
					<label for="end_at_local" class={labelClass}>End (Bangkok)</label>
					<input
						id="end_at_local"
						name="end_at_local"
						type="datetime-local"
						required
						bind:value={endAtLocal}
						class={inputClass}
					/>
				</div>
			</div>

			<div>
				<label for="venue_name" class={labelClass}>Venue name</label>
				<input
					id="venue_name"
					name="venue_name"
					type="text"
					required
					bind:value={venueName}
					class={inputClass}
				/>
			</div>

			<div class="space-y-2">
				<p class={labelClass}>Venue location</p>
				<MapPinPicker bind:latitude bind:longitude disabled={loading} />
				<input type="hidden" name="latitude" value={latitude ?? ''} />
				<input type="hidden" name="longitude" value={longitude ?? ''} />
			</div>

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
						class={inputClass}
					/>
				</div>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					{#if shuttleOptions.length === 0}
						<p class="text-sm text-amber-700">
							Add shuttlecocks in club settings before creating a session.
						</p>
					{:else}
						<SelectMenu
							id="shuttle_id"
							label="Shuttle"
							options={shuttleOptions}
							bind:value={shuttleId}
							onchange={() => applyShuttleDefaultPrice()}
						/>
						<input type="hidden" name="shuttle_id" value={shuttleId} />
					{/if}
				</div>
				<div>
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
			</div>

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

			<SubmitButton
				loading={loading}
				loadingLabel="Creating…"
				disabled={data.shuttles.length === 0}
			>
				Create session
			</SubmitButton>
		</form>
	</AppCard>
</section>
