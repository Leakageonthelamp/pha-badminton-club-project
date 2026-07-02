<script lang="ts">
	import { page } from '$app/state';
	import { t } from '$lib/i18n';
	import AppLogo from '$lib/components/AppLogo.svelte';
	import { appConfig } from '$lib/config/app';
	import { clubWorkspaceState } from '$lib/clubWorkspace.svelte';
	import { getHomePath } from '$lib/navigation/back';
	import type { AdminDashboardMode } from '$lib/server/adminDashboardMode';
	import type { AppRole } from '$lib/types/auth';
	import BanknotesIcon from '@repo/ui/icons/BanknotesIcon.svelte';
	import CalendarDaysIcon from '@repo/ui/icons/CalendarDaysIcon.svelte';
	import HomeIcon from '@repo/ui/icons/HomeIcon.svelte';
	import SettingsIcon from '@repo/ui/icons/SettingsIcon.svelte';
	import UserGroupIcon from '@repo/ui/icons/UserGroupIcon.svelte';
	import UserIcon from '@repo/ui/icons/UserIcon.svelte';

	type NavItem = {
		href: string;
		label: string;
		icon: typeof HomeIcon;
		match: (pathname: string) => boolean;
	};

	let {
		appRole,
		dashboardMode,
		hasClubMembership
	}: {
		appRole: AppRole | null | undefined;
		dashboardMode: AdminDashboardMode;
		hasClubMembership: boolean;
	} = $props();

	const homeHref = $derived(getHomePath(appRole, dashboardMode, hasClubMembership));
	const inClubWorkspace = $derived(
		appRole === 'club_admin' ||
			(appRole === 'super_admin' && dashboardMode === 'club' && hasClubMembership)
	);
	const activeClubId = $derived(clubWorkspaceState.selectedClubId);

	const navItems = $derived.by((): NavItem[] => {
		if (inClubWorkspace) {
			const items: NavItem[] = [
				{
					href: '/dashboard',
					label: t('dashboard.club.eyebrow'),
					icon: HomeIcon,
					match: (pathname) => pathname === '/dashboard'
				},
				{
					href: '/sessions',
					label: t('dashboard.super.sessions.title'),
					icon: CalendarDaysIcon,
					match: (pathname) =>
						pathname === '/sessions' ||
						(pathname.startsWith('/sessions/') &&
							!pathname.startsWith('/sessions/history') &&
							!pathname.startsWith('/sessions/new'))
				},
				{
					href: '/transactions',
					label: t('dashboard.super.transactions.title'),
					icon: BanknotesIcon,
					match: (pathname) => pathname.startsWith('/transactions')
				}
			];

			if (activeClubId) {
				items.push({
					href: `/clubs/${activeClubId}`,
					label: t('dashboard.club.clubSettings.title'),
					icon: SettingsIcon,
					match: (pathname) => pathname.startsWith(`/clubs/${activeClubId}`)
				});
			}

			return items;
		}

		return [
			{
				href: '/',
				label: t('dashboard.super.allClubs'),
				icon: UserGroupIcon,
				match: (pathname) => pathname === '/' || /^\/clubs\/[^/]+$/.test(pathname)
			},
			{
				href: '/users',
				label: t('dashboard.super.users.title'),
				icon: UserIcon,
				match: (pathname) => pathname.startsWith('/users')
			},
			{
				href: '/sessions',
				label: t('dashboard.super.sessions.title'),
				icon: CalendarDaysIcon,
				match: (pathname) =>
					pathname === '/sessions' ||
					(pathname.startsWith('/sessions/') &&
						!pathname.startsWith('/sessions/history') &&
						!pathname.startsWith('/sessions/new'))
			},
			{
				href: '/transactions',
				label: t('dashboard.super.transactions.title'),
				icon: BanknotesIcon,
				match: (pathname) => pathname.startsWith('/transactions')
			}
		];
	});
</script>

<aside
	class="app-admin-sidebar hidden shrink-0 flex-col md:sticky md:top-0 md:flex md:max-h-dvh md:w-56 md:self-start md:overflow-y-auto md:border-r md:border-slate-200 md:bg-white/80 md:px-3 md:py-4 md:backdrop-blur-md dark:md:border-slate-800 dark:md:bg-slate-950/80"
	aria-label={t('layout.adminNav.label')}
>
	<a href={homeHref} class="app-topbar-brand mb-6 px-2">
		<span class="app-topbar-mark">
			<AppLogo size={32} title={appConfig.name} />
		</span>
		<span class="app-topbar-title">{appConfig.name}</span>
	</a>

	<nav class="flex flex-col gap-1">
		{#each navItems as item (item.href)}
			{@const active = item.match(page.url.pathname)}
			<a
				href={item.href}
				class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition {active
					? 'bg-brand-50 text-brand-900 ring-1 ring-brand-200/80 dark:bg-brand-950/50 dark:text-brand-100 dark:ring-brand-800/80'
					: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'}"
				aria-current={active ? 'page' : undefined}
			>
				<item.icon class="h-5 w-5 shrink-0" />
				<span class="truncate">{item.label}</span>
			</a>
		{/each}
	</nav>
</aside>
