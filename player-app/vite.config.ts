/// <reference types="vitest/config" />
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const port = Number(env.PORT) || 5173;
	const appName = env.PUBLIC_APP_NAME || 'Clubhouse';
	const appShortName = env.PUBLIC_APP_SHORT_NAME || 'Clubhouse';
	const analyze = env.ANALYZE === 'true';

	return {
		server: {
			port,
			strictPort: true
		},
		plugins: [
			tailwindcss(),
			sveltekit(),
			...(analyze
				? [
						visualizer({
							filename: 'stats.html',
							gzipSize: true,
							open: false
						})
					]
				: []),
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
					description: 'Clubhouse — organize 2v2 badminton club sessions, matches, and payments.',
					lang: 'en',
					dir: 'ltr',
					theme_color: '#f8fafc',
					background_color: '#f8fafc',
					display: 'standalone',
					display_override: ['window-controls-overlay', 'standalone', 'fullscreen'],
					orientation: 'portrait',
					scope: '/',
					start_url: '/',
					categories: ['sports', 'social'],
					prefer_related_applications: false,
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
							src: '/icon-1024.png',
							sizes: '1024x1024',
							type: 'image/png',
							purpose: 'any'
						},
						{
							src: '/icon-maskable-512.png?v=2',
							sizes: '512x512',
							type: 'image/png',
							purpose: 'maskable'
						},
						{
							src: '/icon-maskable-1024.png?v=2',
							sizes: '1024x1024',
							type: 'image/png',
							purpose: 'maskable'
						}
					]
				},
				workbox: {
					// ponytail: SSR on Vercel has no prerendered shell; default navigateFallback '/' breaks SW.
					navigateFallback: null
				}
			})
		],
		test: {
			include: ['src/**/*.{test,spec}.{js,ts}', '../shared/ui/**/*.{test,spec}.{js,ts}']
		}
	};
});
