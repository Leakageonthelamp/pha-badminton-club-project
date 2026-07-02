<script lang="ts">
	import { t } from '$lib/i18n';
	import { navigating, page } from '$app/state';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import Pagination from '@repo/ui/components/Pagination.svelte';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
	import SectionHeading from '@repo/ui/components/SectionHeading.svelte';
	import SelectMenu from '@repo/ui/components/SelectMenu.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import SearchIcon from '@repo/ui/icons/SearchIcon.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	let searchQuery = $state('');
	let roleFilter = $state('');

	const hasDetail = $derived(/^\/users\/[^/]+$/.test(page.url.pathname));

	const roleFilterOptions = $derived([
		{ value: '', label: t('users.list.allRoles') },
		{ value: 'player', label: t('role.player') },
		{ value: 'club_admin', label: t('role.clubAdmin') },
		{ value: 'super_admin', label: t('role.superAdmin') }
	]);

	const isFetchingUsers = $derived(
		navigating.to !== null && navigating.to.url.pathname === '/users'
	);

	$effect(() => {
		searchQuery = data.searchQuery;
		roleFilter = data.roleFilter;
	});

	function buildPageUrl(pageNum: number): string {
		const params = new URLSearchParams();
		if (data.searchQuery) params.set('q', data.searchQuery);
		if (data.roleFilter) params.set('role', data.roleFilter);
		if (pageNum > 1) params.set('page', String(pageNum));
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

<div class="lg:flex lg:items-start lg:gap-6">
	<section class="min-w-0 space-y-6 {hasDetail ? 'hidden lg:block lg:w-80 lg:shrink-0' : 'w-full'}">
		<DashboardHero
			eyebrow={t('users.list.eyebrow')}
			title={t('users.list.title')}
			subtitle={t('users.list.subtitle')}
		/>

		<form method="GET" action="/users" class="space-y-3">
			<div class="app-filter-row">
				<div class="min-w-0">
					<label for="user-search" class="app-filter-label">{t('dashboard.super.searchLabel')}</label>
					<input
						id="user-search"
						type="search"
						name="q"
						bind:value={searchQuery}
						placeholder={t('users.list.searchPlaceholder')}
						minlength="2"
						class="app-filter-input"
					/>
				</div>
				<div class="min-w-0">
					<SelectMenu
						id="user-role-filter"
						label={t('users.list.roleLabel')}
						options={roleFilterOptions}
						bind:value={roleFilter}
					/>
					<input type="hidden" name="role" value={roleFilter} />
				</div>
				<div class="app-filter-submit-wrap">
					<span class="app-filter-label invisible" aria-hidden="true">{t('dashboard.super.searchLabel')}</span>
					<button
						type="submit"
						class="app-filter-submit"
						aria-label={t('users.list.searchAria')}
						title={t('dashboard.super.searchLabel')}
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
			<div class="space-y-4" aria-busy="true" aria-label={t('users.list.loadingAria')}>
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
			<EmptyState message={t('users.list.empty')} />
		{:else}
			<div class="space-y-4">
				<SectionHeading title="{data.totalCount} user{data.totalCount === 1 ? '' : 's'}" />
				{#if data.searchQuery}
					<p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
						Results for “{data.searchQuery}”
					</p>
				{/if}

				<ul class="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
					{#each data.users as user (user.id)}
						{@const isActive = page.url.pathname === `/users/${user.id}`}
						<li>
							<a
								href="/users/{user.id}"
								class="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-950 {isActive
									? 'bg-brand-50/70 dark:bg-brand-950/30'
									: ''}"
								aria-current={isActive ? 'page' : undefined}
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
											{user.app_role === 'super_admin'
												? t('role.superAdmin')
												: user.app_role === 'club_admin'
													? t('role.clubAdmin')
													: t('role.player')}
										</span>
										{#if user.isBanned}
											<span class="app-role-badge bg-red-50 text-red-800 ring-1 ring-red-200/80">
												{t('users.list.banned')}
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

	<div class="min-w-0 flex-1 {!hasDetail ? 'hidden lg:block' : ''}">
		{@render children()}
	</div>
</div>
