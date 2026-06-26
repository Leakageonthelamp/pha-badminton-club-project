<script lang="ts">
	import DashboardTile from '$lib/components/DashboardTile.svelte';
	import SettingsIcon from '$lib/components/icons/SettingsIcon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const singleClub = $derived(data.clubs.length === 1 ? data.clubs[0] : null);
</script>

<section class="space-y-6">
	<div
		class="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-5 text-white shadow-lg shadow-brand-300/30"
	>
		<p class="text-sm font-medium text-brand-100">Welcome back</p>
		<h1 class="mt-1 text-2xl font-semibold tracking-tight">{data.profileName}</h1>
		{#if singleClub}
			<p class="mt-3 inline-flex max-w-full items-center rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
				<span class="truncate">{singleClub.name}</span>
				{#if !singleClub.is_active}
					<span class="ml-2 shrink-0 text-xs text-amber-200">Inactive</span>
				{/if}
			</p>
		{:else if data.clubs.length > 1}
			<p class="mt-2 text-sm text-brand-100">{data.clubs.length} clubs assigned</p>
		{/if}
	</div>

	{#if data.clubs.length === 0}
		<div class="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
			<p class="text-slate-600">No clubs assigned to you yet.</p>
		</div>
	{:else}
		<div class="space-y-4">
			<h2 class="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Quick actions</h2>
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
