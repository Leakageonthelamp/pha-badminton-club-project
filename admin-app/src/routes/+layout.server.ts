import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, serviceUnavailable } }) => {
	if (serviceUnavailable) {
		return { session: null, user: null, serviceUnavailable: true };
	}

	const { session, user } = await safeGetSession();

	return {
		session,
		user,
		serviceUnavailable: serviceUnavailable ?? false
	};
};
