<script lang="ts">
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import { appRoleLabel } from '$lib/types/auth';
	import type { AppRole } from '$lib/types/auth';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const inputClass =
		'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20';

	const roleFilters: { value: string; label: string }[] = [
		{ value: '', label: 'All roles' },
		{ value: 'player', label: appRoleLabel('player') },
		{ value: 'club_admin', label: appRoleLabel('club_admin') },
		{ value: 'super_admin', label: appRoleLabel('super_admin') }
	];

	function buildPageUrl(page: number): string {
		const params = new URLSearchParams();
		if (data.searchQuery) params.set('q', data.searchQuery);
		if (data.roleFilter) params.set('role', data.roleFilter);
		if (page > 1) params.set('page', String(page));
		const query = params.toString();
		return query ? `/users?${query}` : '/users';
	}

	function formatClubSummary(names: string[], count: number): string {
		if (count === 0) return '';
		const shown = names.slice(0, 3).join(', ');
		const remaining = count - Math.min(names.length, 3);
		return remaining > 0 ? `${shown} +${remaining}` : shown;
	}
</script>

<section class="space-y-6">
	<DashboardHero
		eyebrow="User management"
		title="All users"
		subtitle="Search and manage accounts across the system."
	/>

	<form method="GET" action="/users" class="space-y-3">
		<div class="flex flex-col gap-3 sm:flex-row">
			<input
				type="search"
				name="q"
				value={data.searchQuery}
				placeholder="Search name, tag, email, or phone"
				minlength="2"
				class="{inputClass} flex-1"
			/>
			<select name="role" class="{inputClass} sm:w-40" value={data.roleFilter}>
				{#each roleFilters as filter (filter.value)}
					<option value={filter.value}>{filter.label}</option>
				{/each}
			</select>
			<SubmitButton type="submit" variant="secondary" class="!w-full sm:!w-auto">Search</SubmitButton>
		</div>
	</form>

	{#if data.users.length === 0}
		<EmptyState message="No users found." />
	{:else}
		<div class="space-y-4">
			<SectionHeading title="{data.totalCount} user{data.totalCount === 1 ? '' : 's'}" />
			{#if data.searchQuery}
				<p class="text-sm text-slate-500">Results for “{data.searchQuery}”</p>
			{/if}

			<ul class="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
				{#each data.users as user (user.id)}
					<li>
						<a
							href="/users/{user.id}"
							class="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50"
						>
							<UserAvatar
								displayName={user.display_name}
								avatarUrl={user.avatar_url}
								size="md"
							/>
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<span class="truncate font-medium text-slate-900">{user.display_name}</span>
									{#if user.tag}
										<TagPill tag={user.tag} />
									{/if}
									<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
										{appRoleLabel(user.app_role as AppRole)}
									</span>
									{#if user.managedClubCount > 0}
										<span
											class="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800"
										>
											{user.managedClubCount} club{user.managedClubCount === 1 ? '' : 's'}
										</span>
									{/if}
								</div>
								{#if user.managedClubCount > 0}
									<p class="mt-1 truncate text-sm text-slate-500">
										{formatClubSummary(user.managedClubNames, user.managedClubCount)}
									</p>
								{/if}
							</div>
						</a>
					</li>
				{/each}
			</ul>

			{#if data.hasPrevPage || data.hasNextPage}
				<div class="flex justify-between gap-3">
					{#if data.hasPrevPage}
						<a href={buildPageUrl(data.page - 1)} class="text-sm font-medium text-brand-700 hover:text-brand-800">
							Previous
						</a>
					{:else}
						<span></span>
					{/if}
					<span class="text-sm text-slate-500">Page {data.page}</span>
					{#if data.hasNextPage}
						<a href={buildPageUrl(data.page + 1)} class="text-sm font-medium text-brand-700 hover:text-brand-800">
							Next
						</a>
					{:else}
						<span></span>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</section>
