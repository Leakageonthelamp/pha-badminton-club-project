import type { SupabaseClient } from '@supabase/supabase-js';

/** session_players RLS uses auth.uid(); parallel layout loads can race this on full page load. */
export const ensureSupabaseAuth = async (supabase: SupabaseClient): Promise<boolean> => {
	const {
		data: { user },
		error
	} = await supabase.auth.getUser();

	if (error || !user) {
		console.error('Supabase auth not ready for RLS query', error);
		return false;
	}

	return true;
};
