/// <reference types="@sveltejs/kit" />

import type { App as AppTypes } from '$lib/types/app';

declare global {
	namespace App {
		interface Error extends AppTypes.Error {}
		interface Locals extends AppTypes.Locals {}
	}
}

export {};
