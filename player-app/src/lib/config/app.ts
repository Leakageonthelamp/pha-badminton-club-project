import { PUBLIC_APP_NAME, PUBLIC_APP_SHORT_NAME, PUBLIC_APP_VERSION } from '$env/static/public';

export const appConfig = {
	name: PUBLIC_APP_NAME,
	shortName: PUBLIC_APP_SHORT_NAME,
	version: PUBLIC_APP_VERSION
} as const;
