<script lang="ts">
	import LanguageIcon from '../icons/LanguageIcon.svelte';
	import MenuSelectedMark from './MenuSelectedMark.svelte';
	import { i18n, setLocale, t } from '../i18n/i18n.svelte';
	import { LOCALES, LOCALE_LABELS, type Locale } from '../i18n/locale';

	let open = $state(false);

	const currentLabel = $derived(LOCALE_LABELS[i18n.locale]);

	function toggleMenu() {
		open = !open;
	}

	function closeMenu() {
		open = false;
	}

	function pickLocale(locale: Locale) {
		if (locale === i18n.locale) {
			closeMenu();
			return;
		}
		setLocale(locale);
		closeMenu();
	}
</script>

<div class="relative shrink-0">
	<button
		type="button"
		class="app-nav-icon-btn"
		aria-expanded={open}
		aria-haspopup="menu"
		aria-label={t('nav.languageAria', { language: currentLabel })}
		title={t('nav.language')}
		onclick={toggleMenu}
	>
		<LanguageIcon class="h-5 w-5 text-brand-700" />
	</button>

	{#if open}
		<button
			type="button"
			class="fixed inset-0 z-40 cursor-default"
			aria-label={t('nav.closeLanguageMenu')}
			onclick={closeMenu}
		></button>

		<div
			class="absolute right-0 top-full z-50 mt-2 w-44 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
			role="menu"
		>
			<div class="border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
				<p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
					{t('nav.language')}
				</p>
			</div>

			<div class="space-y-0.5 p-1.5">
				{#each LOCALES as locale (locale)}
					<button
						type="button"
						role="menuitem"
						aria-current={locale === i18n.locale ? 'true' : undefined}
						class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition {locale ===
						i18n.locale
							? 'bg-brand-50 text-brand-800 dark:bg-slate-900/50 dark:text-brand-200'
							: 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}"
						onclick={() => pickLocale(locale)}
					>
						<span class="flex-1">{LOCALE_LABELS[locale]}</span>
						{#if locale === i18n.locale}
							<MenuSelectedMark />
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
