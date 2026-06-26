import type { LayoutServerLoad } from './$types';
import { authLoadDepends } from '$lib/navigation/authCache';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, serviceUnavailable }, depends }) => {
	if (serviceUnavailable) {
		return { session: null, user: null, serviceUnavailable: true };
	}

	const { session, user } = await safeGetSession();
	authLoadDepends(user?.id, depends);

	return {
		session,
		user,
		serviceUnavailable: serviceUnavailable ?? false
	};
};
