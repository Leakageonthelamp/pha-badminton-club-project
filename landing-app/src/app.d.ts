/// <reference types="@sveltejs/kit" />

declare global {
	namespace App {
		// eslint-disable-next-line @typescript-eslint/no-empty-object-type
		interface Error {}
		// eslint-disable-next-line @typescript-eslint/no-empty-object-type
		interface Locals {}
	}
}

export {};
