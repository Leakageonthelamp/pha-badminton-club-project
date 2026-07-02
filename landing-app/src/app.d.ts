/// <reference types="@sveltejs/kit" />

declare global {
	namespace App {
		// eslint-disable-next-line @typescript-eslint/no-empty-object-type
		interface Error {}
		interface Locals {
			locale: import('@repo/ui/i18n/locale').Locale;
		}
	}
}

export {};
