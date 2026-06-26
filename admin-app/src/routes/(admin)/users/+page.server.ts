import { assertSuperAdmin } from '$lib/server/clubAccess';
import { buildProfileSearchOrFilter } from '$lib/server/profileSearch';
import type { AppRole, Profile } from '$lib/types/auth';
import { appRoleLabel } from '$lib/types/auth';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 25;

const VALID_ROLE_FILTERS = new Set<AppRole>(['player', 'club_admin', 'super_admin']);

export type UserListItem = Pick<
	Profile,
	'id' | 'display_name' | 'tag' | 'email' | 'phone' | 'app_role' | 'avatar_url' | 'sign_in_method'
> & {
	managedClubCount: number;
	managedClubNames: string[];
};

export const load: PageServerLoad = async ({ url, locals: { supabase, appRole } }) => {
	assertSuperAdmin(appRole);

	const searchQuery = url.searchParams.get('q')?.trim() ?? '';
	const roleFilter = url.searchParams.get('role')?.trim() ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
	const from = (page - 1) * PAGE_SIZE;
	const to = from + PAGE_SIZE - 1;

	let query = supabase
		.from('profiles')
		.select(
			'id, display_name, tag, email, phone, app_role, avatar_url, sign_in_method',
			{ count: 'exact' }
		)
		.order('created_at', { ascending: false })
		.range(from, to);

	if (roleFilter && VALID_ROLE_FILTERS.has(roleFilter as AppRole)) {
		query = query.eq('app_role', roleFilter);
	}

	if (searchQuery.length >= 2) {
		query = query.or(buildProfileSearchOrFilter(searchQuery));
	}

	const { data: profiles, error: profilesError, count } = await query;

	if (profilesError) {
		console.error('Failed to load users', profilesError);
		return {
			users: [] as UserListItem[],
			searchQuery,
			roleFilter,
			page,
			totalCount: 0,
			hasNextPage: false,
			hasPrevPage: false
		};
	}

	const profileRows = profiles ?? [];
	const userIds = profileRows.map((profile) => profile.id);
	const clubContext = await loadManagedClubContext(supabase, userIds);

	const users: UserListItem[] = profileRows.map((profile) => {
		const context = clubContext.get(profile.id) ?? { count: 0, names: [] };
		return {
			...profile,
			managedClubCount: context.count,
			managedClubNames: context.names
		};
	});

	const totalCount = count ?? 0;

	return {
		users,
		searchQuery,
		roleFilter,
		page,
		totalCount,
		hasNextPage: from + PAGE_SIZE < totalCount,
		hasPrevPage: page > 1
	};
};

const loadManagedClubContext = async (
	supabase: App.Locals['supabase'],
	userIds: string[]
): Promise<Map<string, { count: number; names: string[] }>> => {
	const result = new Map<string, { count: number; names: string[] }>();

	if (!userIds.length) {
		return result;
	}

	const { data: memberships, error: membershipError } = await supabase
		.from('club_admins')
		.select('user_id, club_id')
		.in('user_id', userIds);

	if (membershipError) {
		console.error('Failed to load club memberships for user list', membershipError);
		return result;
	}

	const clubIds = [...new Set((memberships ?? []).map((row) => row.club_id))];
	const clubNames = new Map<string, string>();

	if (clubIds.length) {
		const { data: clubs, error: clubsError } = await supabase
			.from('clubs')
			.select('id, name')
			.in('id', clubIds);

		if (clubsError) {
			console.error('Failed to load club names for user list', clubsError);
		} else {
			for (const club of clubs ?? []) {
				clubNames.set(club.id, club.name);
			}
		}
	}

	for (const userId of userIds) {
		result.set(userId, { count: 0, names: [] });
	}

	for (const membership of memberships ?? []) {
		const entry = result.get(membership.user_id);
		if (!entry) {
			continue;
		}

		entry.count += 1;
		const name = clubNames.get(membership.club_id);
		if (name) {
			entry.names.push(name);
		}
	}

	return result;
};
