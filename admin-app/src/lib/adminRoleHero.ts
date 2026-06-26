import type { AppRole } from '$lib/types/auth';

export const adminRoleHeroBadgeClass = (role: AppRole | null | undefined): string => {
	if (role === 'super_admin') {
		return 'app-hero-badge--role-super';
	}

	if (role === 'club_admin') {
		return 'app-hero-badge--role-club';
	}

	return '';
};

export const adminRoleBadgeClass = (role: AppRole): string => {
	if (role === 'super_admin') {
		return 'bg-violet-50 text-violet-800 ring-1 ring-violet-200/80';
	}

	if (role === 'club_admin') {
		return 'bg-sky-50 text-sky-800 ring-1 ring-sky-200/80';
	}

	return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80';
};
