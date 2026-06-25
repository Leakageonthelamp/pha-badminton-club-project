/// <reference types="vitest/config" />
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const port = Number(env.PORT) || 5173;
	const appName = env.PUBLIC_APP_NAME || 'PH Badminton Club';
	const appShortName = env.PUBLIC_APP_SHORT_NAME || 'PH Badminton';

	return {
		server: {
			port,
			strictPort: false
		},
		plugins: [
			tailwindcss(),
			sveltekit(),
			SvelteKitPWA({
				registerType: 'prompt',
				devOptions: {
					enabled: true,
					type: 'module',
					suppressWarnings: true
				},
				manifest: {
					id: '/',
					name: appName,
					short_name: appShortName,
					description: 'Organize 2v2 badminton club sessions, matches, and payments.',
					lang: 'en',
					dir: 'ltr',
					theme_color: '#964ac0',
					background_color: '#f8fafc',
					display: 'standalone',
					display_override: ['standalone', 'browser'],
					orientation: 'portrait',
					scope: '/',
					start_url: '/',
					categories: ['sports', 'social'],
					icons: [
						{
							src: '/icon-192.png',
							sizes: '192x192',
							type: 'image/png',
							purpose: 'any'
						},
						{
							src: '/icon-512.png',
							sizes: '512x512',
							type: 'image/png',
							purpose: 'any'
						},
						{
							src: '/icon-maskable-512.png',
							sizes: '512x512',
							type: 'image/png',
							purpose: 'maskable'
						}
					]
				},
				workbox: {
					modifyURLPrefix: {},
					globPatterns: [
						'client/**/*.{js,css,ico,png,svg,webp,webmanifest}',
						'client/*.webmanifest'
					],
					globIgnores: ['server/**']
				}
			})
		],
		test: {
			include: ['src/**/*.{test,spec}.{js,ts}']
		}
	};
});
