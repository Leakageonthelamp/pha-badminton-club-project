<script lang="ts">
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import ActionRowLink from '@repo/ui/components/ActionRowLink.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import SelectMenu from '@repo/ui/components/SelectMenu.svelte';
	import BuildingIcon from '@repo/ui/icons/BuildingIcon.svelte';
	import SettingsIcon from '@repo/ui/icons/SettingsIcon.svelte';
	import type { LayoutData } from '../$types';
	import type { PageData } from './$types';

	const SELECTED_CLUB_KEY = 'admin:selectedClubId';

	let { data }: { data: PageData & LayoutData } = $props();

	let selectedClubId = $state('');

	const hasMultipleClubs = $derived(data.clubs.length > 1);
	const activeClub = $derived(
		data.clubs.find((club) => club.id === selectedClubId) ?? data.clubs[0] ?? null
	);
	const clubOptions = $derived(
		data.clubs.map((club) => ({
			value: club.id,
			label: club.name,
			hint: club.is_active ? undefined : 'Inactive'
		}))
	);

	$effect(() => {
		const clubs = data.clubs;
		if (!clubs.length) {
			selectedClubId = '';
			return;
		}

		if (selectedClubId && clubs.some((club) => club.id === selectedClubId)) {
			return;
		}

		let nextId = clubs[0].id;
		if (typeof localStorage !== 'undefined') {
			const stored = localStorage.getItem(SELECTED_CLUB_KEY);
			if (stored && clubs.some((club) => club.id === stored)) {
				nextId = stored;
			}
		}

		selectedClubId = nextId;
	});

	function persistClubSelection() {
		if (typeof localStorage !== 'undefined' && selectedClubId) {
			localStorage.setItem(SELECTED_CLUB_KEY, selectedClubId);
		}
	}
</script>

<section class="space-y-6">
	<DashboardHero eyebrow="Welcome back" title={data.profileName} tag={data.profile?.tag}>
		{#if activeClub}
			<p class="app-hero-badge">
				<span class="truncate">{activeClub.name}</span>
				{#if !activeClub.is_active}
					<span class="ml-2 shrink-0 text-xs text-amber-200">Inactive</span>
				{/if}
			</p>
		{/if}
	</DashboardHero>

	{#if data.clubs.length === 0}
		<EmptyState message="No clubs assigned to you yet." />
	{:else if hasMultipleClubs}
		<div class="space-y-4">
			<SectionHeading title="Workspace" />
			<AppCard padded={false}>
				<div class="rounded-t-3xl bg-linear-to-br from-brand-50 to-brand-100/70 px-4 py-3.5">
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-brand-200/70"
						>
							<BuildingIcon class="h-5 w-5 text-brand-700" />
						</div>
						<div class="min-w-0">
							<p class="font-semibold text-slate-900">Switch club</p>
							<p class="text-xs text-slate-600">
								{data.clubs.length} clubs · saved on this device
							</p>
						</div>
					</div>
				</div>

				<div class="space-y-2.5 p-4">
					<SelectMenu
						id="club-workspace"
						label="Active club"
						options={clubOptions}
						bind:value={selectedClubId}
						onchange={persistClubSelection}
					/>
					{#if activeClub && !activeClub.is_active}
						<span
							class="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200/80"
						>
							Inactive club
						</span>
					{/if}
				</div>
			</AppCard>
		</div>

		<div class="space-y-4">
			<SectionHeading title="Quick actions" />
			{#if activeClub}
				<ActionRowLink
					href="/clubs/{activeClub.id}"
					title="Club settings"
					description="Shuttles, PromptPay & location"
					icon={SettingsIcon}
				/>
			{/if}
		</div>
	{:else if activeClub}
		<div class="space-y-4">
			<SectionHeading title="Quick actions" />
			<ActionRowLink
				href="/clubs/{activeClub.id}"
				title="Club settings"
				description="Shuttles, PromptPay & location"
				icon={SettingsIcon}
			/>
		</div>
	{/if}
</section>
