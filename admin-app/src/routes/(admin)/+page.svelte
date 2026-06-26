<script lang="ts">
	import ActionRowLink from '@repo/ui/components/ActionRowLink.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import DashboardTile from '@repo/ui/components/DashboardTile.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import BuildingIcon from '@repo/ui/icons/BuildingIcon.svelte';
	import PlusIcon from '@repo/ui/icons/PlusIcon.svelte';
	import UserIcon from '@repo/ui/icons/UserIcon.svelte';
	import type { LayoutData } from '../$types';
	import type { PageData } from './$types';

	let { data }: { data: PageData & LayoutData } = $props();

	const profileName = $derived(data.profile?.display_name ?? 'Super admin');
	const clubCount = $derived(data.clubs.length);
	const activeClubCount = $derived(data.clubs.filter((club) => club.is_active).length);
	const inactiveClubCount = $derived(clubCount - activeClubCount);
</script>

<section class="space-y-8">
	<DashboardHero
		eyebrow="Admin dashboard"
		title={profileName}
		tag={data.profile?.tag}
		subtitle="Create and manage clubs and their admins."
	>
		{#if clubCount > 0}
			<div class="flex flex-wrap gap-2">
				<span class="app-hero-badge">
					{clubCount} club{clubCount === 1 ? '' : 's'}
				</span>
				{#if activeClubCount > 0}
					<span class="app-hero-badge bg-emerald-400/20 text-emerald-50">
						{activeClubCount} active
					</span>
				{/if}
				{#if inactiveClubCount > 0}
					<span class="app-hero-badge bg-amber-400/20 text-amber-50">
						{inactiveClubCount} inactive
					</span>
				{/if}
			</div>
		{/if}
	</DashboardHero>

	<div class="space-y-3">
		<SectionHeading title="Quick actions" />
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<ActionRowLink
				href="/clubs/new"
				title="Create club"
				description="Add a new club to the system"
				icon={PlusIcon}
				accent="violet"
			/>
			<ActionRowLink
				href="/users"
				title="Users"
				description="View and manage all accounts"
				icon={UserIcon}
				accent="indigo"
			/>
		</div>
	</div>

	{#if data.clubs.length === 0}
		<EmptyState message="No clubs yet.">
			<a href="/clubs/new" class="text-sm font-medium text-brand-700 hover:text-brand-800">
				Create your first club
			</a>
		</EmptyState>
	{:else}
		<div class="space-y-4">
			<div class="app-section-header px-1">
				<div>
					<h2 class="app-section-title">All clubs</h2>
					<p class="app-section-meta">
						{clubCount} total · {activeClubCount} active
						{#if inactiveClubCount > 0}
							· {inactiveClubCount} inactive
						{/if}
					</p>
				</div>
				<a href="/clubs/new" class="app-section-action">
					<PlusIcon class="h-4 w-4" />
					New club
				</a>
			</div>

			<div class="grid grid-cols-2 gap-3 sm:gap-4">
				{#each data.clubs as club (club.id)}
					<DashboardTile
						href="/clubs/{club.id}"
						title={club.name}
						description={club.description || (club.is_active ? 'Active club' : 'Inactive club')}
						icon={BuildingIcon}
						badge={club.is_active ? undefined : 'Inactive'}
					/>
				{/each}
			</div>
		</div>
	{/if}
</section>
