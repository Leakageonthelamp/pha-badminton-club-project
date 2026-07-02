<script lang="ts">
	import { navigating } from '$app/state';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import Pagination from '@repo/ui/components/Pagination.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import SelectMenu from '@repo/ui/components/SelectMenu.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import SearchIcon from '@repo/ui/icons/SearchIcon.svelte';
	import { appRoleLabel } from '$lib/types/auth';
	import type { AppRole } from '$lib/types/auth';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let roleFilter = $state('');

	const roleFilterOptions = [
		{ value: '', label: 'All roles' },
		{ value: 'player', label: appRoleLabel('player') },
		{ value: 'club_admin', label: appRoleLabel('club_admin') },
		{ value: 'super_admin', label: appRoleLabel('super_admin') }
	];

	const isFetchingUsers = $derived(
		navigating.to !== null && navigating.to.url.pathname === '/users'
	);

	$effect(() => {
		searchQuery = data.searchQuery;
		roleFilter = data.roleFilter;
	});

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
		<div class="app-filter-row">
			<div class="min-w-0">
				<label for="user-search" class="app-filter-label">Search</label>
				<input
					id="user-search"
					type="search"
					name="q"
					bind:value={searchQuery}
					placeholder="Search name, tag, email, or phone"
					minlength="2"
					class="app-filter-input"
				/>
			</div>
			<div class="min-w-0">
				<SelectMenu
					id="user-role-filter"
					label="Role"
					options={roleFilterOptions}
					bind:value={roleFilter}
				/>
				<input type="hidden" name="role" value={roleFilter} />
			</div>
			<div class="app-filter-submit-wrap">
				<span class="app-filter-label invisible" aria-hidden="true">Search</span>
				<button
					type="submit"
					class="app-filter-submit"
					aria-label="Search users"
					title="Search"
					disabled={isFetchingUsers}
					aria-busy={isFetchingUsers}
				>
					{#if isFetchingUsers}
						<span
							class="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-brand-700"
							aria-hidden="true"
						></span>
					{:else}
						<SearchIcon class="h-5 w-5 text-brand-700" />
					{/if}
				</button>
			</div>
		</div>
	</form>

	{#if isFetchingUsers}
		<div class="space-y-4" aria-busy="true" aria-label="Loading users">
			<div class="app-skeleton h-5 w-24 rounded-md"></div>
			<ul class="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
				{#each Array(6) as _, index (index)}
					<li class="flex items-center gap-3 px-4 py-3">
						<div class="app-skeleton h-10 w-10 shrink-0 rounded-full"></div>
						<div class="min-w-0 flex-1 space-y-2">
							<div class="app-skeleton h-4 w-48 max-w-full rounded-md"></div>
							<div class="app-skeleton h-3 w-32 max-w-full rounded-md"></div>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{:else if data.users.length === 0}
		<EmptyState message="No users found." />
	{:else}
		<div class="space-y-4">
			<SectionHeading title="{data.totalCount} user{data.totalCount === 1 ? '' : 's'}" />
			{#if data.searchQuery}
				<p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Results for “{data.searchQuery}”</p>
			{/if}

			<ul class="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
				{#each data.users as user (user.id)}
					<li>
						<a
							href="/users/{user.id}"
							class="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-950"
						>
							<UserAvatar
								displayName={user.display_name}
								avatarUrl={user.avatar_url}
								size="md"
							/>
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<span class="truncate font-medium text-slate-900 dark:text-slate-100">{user.display_name}</span>
									{#if user.tag}
										<TagPill tag={user.tag} />
									{/if}
									<span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300 dark:text-slate-600">
										{appRoleLabel(user.app_role as AppRole)}
									</span>
									{#if user.isBanned}
										<span class="app-role-badge bg-red-50 text-red-800 ring-1 ring-red-200/80">
											Banned
										</span>
									{/if}
									{#if user.managedClubCount > 0}
										<span
											class="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800"
										>
											{user.managedClubCount} club{user.managedClubCount === 1 ? '' : 's'}
										</span>
									{/if}
								</div>
								{#if user.managedClubCount > 0}
									<p class="mt-1 truncate text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
										{formatClubSummary(user.managedClubNames, user.managedClubCount)}
									</p>
								{/if}
							</div>
						</a>
					</li>
				{/each}
			</ul>

			<Pagination
				page={data.page}
				hasPrev={data.hasPrevPage}
				hasNext={data.hasNextPage}
				prevHref={data.hasPrevPage ? buildPageUrl(data.page - 1) : undefined}
				nextHref={data.hasNextPage ? buildPageUrl(data.page + 1) : undefined}
			/>
		</div>
	{/if}
</section>
