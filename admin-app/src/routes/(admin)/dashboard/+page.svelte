<script lang="ts">
	import ActionRowLink from '@repo/ui/components/ActionRowLink.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import SettingsIcon from '@repo/ui/icons/SettingsIcon.svelte';
	import { adminRoleHeroBadgeClass } from '$lib/adminRoleHero';
	import { clubWorkspaceState } from '$lib/clubWorkspace.svelte';
	import { appRoleLabel, type AppRole } from '$lib/types/auth';
	import type { LayoutData } from '../$types';
	import type { PageData } from './$types';

	let { data }: { data: PageData & LayoutData } = $props();

	const clubs = $derived(data.managedClubs ?? []);
	const activeClub = $derived(
		clubs.find((club) => club.id === clubWorkspaceState.selectedClubId) ?? clubs[0] ?? null
	);
	const effectiveAppRole = $derived(data.effectiveAppRole ?? null);
	const roleLabel = $derived(
		effectiveAppRole ? appRoleLabel(effectiveAppRole as AppRole) : ''
	);
	const roleBadgeClass = $derived(adminRoleHeroBadgeClass(effectiveAppRole));
</script>

<section class="space-y-6">
	<DashboardHero
		eyebrow="Welcome back"
		title={data.profileName}
		tag={data.profile?.tag}
		roleLabel={roleLabel}
		roleBadgeClass={roleBadgeClass}
		managingClub={activeClub
			? { name: activeClub.name, is_active: activeClub.is_active }
			: null}
	/>

	{#if clubs.length === 0}
		<EmptyState message="No clubs assigned to you yet." />
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
