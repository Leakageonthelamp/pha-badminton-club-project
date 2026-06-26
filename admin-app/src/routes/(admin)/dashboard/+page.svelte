<script lang="ts">
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import DashboardTile from '@repo/ui/components/DashboardTile.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import SettingsIcon from '@repo/ui/icons/SettingsIcon.svelte';
	import type { LayoutData } from '../$types';
	import type { PageData } from './$types';

	let { data }: { data: PageData & LayoutData } = $props();

	const singleClub = $derived(data.clubs.length === 1 ? data.clubs[0] : null);
</script>

<section class="space-y-6">
	<DashboardHero eyebrow="Welcome back" title={data.profileName} tag={data.profile?.tag}>
		{#if singleClub}
			<p class="app-hero-badge">
				<span class="truncate">{singleClub.name}</span>
				{#if !singleClub.is_active}
					<span class="ml-2 shrink-0 text-xs text-amber-200">Inactive</span>
				{/if}
			</p>
		{:else if data.clubs.length > 1}
			<p class="app-hero-subtitle">{data.clubs.length} clubs assigned</p>
		{/if}
	</DashboardHero>

	{#if data.clubs.length === 0}
		<EmptyState message="No clubs assigned to you yet." />
	{:else}
		<div class="space-y-4">
			<SectionHeading title="Quick actions" />
			<div class="grid gap-4 {singleClub ? 'grid-cols-1' : 'grid-cols-2'}">
				{#each data.clubs as club (club.id)}
					<DashboardTile
						href="/clubs/{club.id}"
						title="Club settings"
						description={singleClub
							? 'Shuttles, PromptPay & location'
							: `${club.name}`}
						icon={SettingsIcon}
						badge={!club.is_active ? 'Inactive' : undefined}
						large={!!singleClub}
					/>
				{/each}
			</div>
		</div>
	{/if}
</section>
