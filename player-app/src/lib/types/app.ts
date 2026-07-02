import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { Locale } from '@repo/ui/i18n';

export namespace App {
	export interface Locals {
		supabase: SupabaseClient;
		safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
		session: Session | null;
		user: User | null;
		serviceUnavailable: boolean;
		locale: Locale;
	}

	export interface Error {
		message: string;
		code?: string;
	}
}
