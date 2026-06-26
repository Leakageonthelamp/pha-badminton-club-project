<script lang="ts">
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import DashboardTile from '@repo/ui/components/DashboardTile.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import BuildingIcon from '@repo/ui/icons/BuildingIcon.svelte';
	import PlusIcon from '@repo/ui/icons/PlusIcon.svelte';
	import type { LayoutData } from '../$types';
	import type { PageData } from './$types';

	let { data }: { data: PageData & LayoutData } = $props();

	const profileName = $derived(data.profile?.display_name ?? 'Super admin');
</script>

<section class="space-y-6">
	<DashboardHero
		eyebrow="Admin dashboard"
		title={profileName}
		tag={data.profile?.tag}
		subtitle="Create and manage clubs and their admins."
	/>

	<div class="space-y-4">
		<SectionHeading title="Quick actions" />
		<div class="grid grid-cols-1 gap-4 sm:max-w-xs">
			<DashboardTile
				href="/clubs/new"
				title="Create club"
				description="Add a new club to the system"
				icon={PlusIcon}
				large
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
			<SectionHeading title="All clubs" />
			<div class="grid grid-cols-2 gap-4">
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
