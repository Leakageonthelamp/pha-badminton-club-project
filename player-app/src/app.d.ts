/// <reference types="@sveltejs/kit" />

import type { App as AppTypes } from '$lib/types/app';

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
		interface Error extends AppTypes.Error {}
		interface Locals extends AppTypes.Locals {}
	}
}

export {};
