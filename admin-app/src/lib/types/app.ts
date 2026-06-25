import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { AppRole } from '$lib/types/auth';

export namespace App {
	export interface Locals {
		supabase: SupabaseClient;
		safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
		session: Session | null;
		user: User | null;
		appRole: AppRole | null;
		serviceUnavailable: boolean;
	}

	export interface Error {
		message: string;
		code?: string;
	}
}
