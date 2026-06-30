/// <reference types="vitest/config" />
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const port = Number(env.PORT) || 5174;
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
				: [])
		],
		test: {
			include: ['src/**/*.{test,spec}.{js,ts}', '../shared/ui/**/*.{test,spec}.{js,ts}']
		}
	};
});
