import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { Locale } from '@repo/ui/i18n';
import type { AppRole } from '$lib/types/auth';

export namespace App {
	export interface Locals {
		supabase: SupabaseClient;
		safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
		session: Session | null;
		user: User | null;
		appRole: AppRole | null;
		serviceUnavailable: boolean;
		locale: Locale;
	}

	export interface Error {
		message: string;
		code?: string;
	}
}
