import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import svelteParser from 'svelte-eslint-parser';
import tseslint from 'typescript-eslint';
import svelteConfig from './player-app/svelte.config.js';
import adminSvelteConfig from './admin-app/svelte.config.js';
import landingSvelteConfig from './landing-app/svelte.config.js';

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
	{
		ignores: [
			'**/node_modules/**',
			'**/.svelte-kit/**',
			'**/build/**',
			'**/dist/**',
			'**/dev-dist/**',
			'**/.yarn/**',
			'player-app/static/**',
			'player-app/svelte.config.js',
			'player-app/vite.config.ts',
			'admin-app/static/**',
			'admin-app/svelte.config.js',
			'admin-app/vite.config.ts',
			'landing-app/static/**',
			'landing-app/svelte.config.js',
			'landing-app/vite.config.ts'
		]
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	...svelte.configs.recommended,
	eslintConfigPrettier,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				App: 'readonly',
				BeforeInstallPromptEvent: 'readonly'
			}
		}
	},
	{
		files: ['player-app/**/*.{ts,js,mjs,cjs}'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_'
				}
			]
		}
	},
	{
		files: ['player-app/**/*.svelte'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.svelte'],
				parser: tseslint.parser,
				svelteConfig
			}
		},
		rules: {
			// ponytail: PwaHead only injects vite-pwa manifest linkTag
			'svelte/no-at-html-tags': 'off',
			// Form fields sync props via $state + $effect (controlled inputs)
			'svelte/prefer-writable-derived': 'off',
			// Dynamic href props (BackLink) and plain internal links
			'svelte/no-navigation-without-resolve': 'off',
			// +error.svelte legitimately receives status and error props
			'svelte/valid-prop-names-in-kit-pages': 'off'
		}
	},
	{
		files: ['admin-app/**/*.{ts,js,mjs,cjs}'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_'
				}
			]
		}
	},
	{
		files: ['admin-app/**/*.svelte'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.svelte'],
				parser: tseslint.parser,
				svelteConfig: adminSvelteConfig
			}
		},
		rules: {
			'svelte/prefer-writable-derived': 'off',
			'svelte/no-navigation-without-resolve': 'off',
			'svelte/valid-prop-names-in-kit-pages': 'off'
		}
	},
	{
		files: ['landing-app/**/*.{ts,js,mjs,cjs}'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_'
				}
			]
		}
	},
	{
		files: ['landing-app/**/*.svelte'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.svelte'],
				parser: tseslint.parser,
				svelteConfig: landingSvelteConfig
			}
		},
		rules: {
			'svelte/prefer-writable-derived': 'off',
			'svelte/no-navigation-without-resolve': 'off',
			'svelte/valid-prop-names-in-kit-pages': 'off'
		}
	},
	{
		files: ['player-app/**/*.svelte.{ts,js}'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tseslint.parser,
				projectService: true,
				tsconfigRootDir: `${import.meta.dirname}/player-app`,
				extraFileExtensions: ['.svelte'],
				svelteFeatures: { runes: true },
				svelteConfig
			}
		}
	},
	{
		files: ['admin-app/**/*.svelte.{ts,js}'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tseslint.parser,
				projectService: true,
				tsconfigRootDir: `${import.meta.dirname}/admin-app`,
				extraFileExtensions: ['.svelte'],
				svelteFeatures: { runes: true },
				svelteConfig: adminSvelteConfig
			}
		}
	},
	{
		files: ['landing-app/**/*.svelte.{ts,js}'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tseslint.parser,
				projectService: true,
				tsconfigRootDir: `${import.meta.dirname}/landing-app`,
				extraFileExtensions: ['.svelte'],
				svelteFeatures: { runes: true },
				svelteConfig: landingSvelteConfig
			}
		}
	},
	{
		files: ['shared/**/*.svelte.{ts,js}'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tseslint.parser,
				svelteFeatures: { runes: true }
			}
		}
	}
);
