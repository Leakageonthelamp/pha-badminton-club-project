import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

declare global {
	interface BeforeInstallPromptEvent extends Event {
		readonly platforms: string[];
		readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
		prompt(): Promise<void>;
	}

	interface WindowEventMap {
		beforeinstallprompt: BeforeInstallPromptEvent;
	}

	namespace App {
		interface Error {
			message: string;
		}

		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			session: Session | null;
			user: User | null;
		}
	}
}

export {};
