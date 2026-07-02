<script lang="ts">
	import { i18n, setLocale, t } from '$lib/i18n';
	import { LOCALES, LOCALE_LABELS, type Locale } from '@repo/ui/i18n/locale';

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
		class="landing-btn-secondary !px-4 !py-2 text-sm"
		aria-expanded={open}
		aria-haspopup="menu"
		aria-label={t('nav.languageAria', { language: currentLabel })}
		title={t('nav.language')}
		onclick={toggleMenu}
	>
		{currentLabel}
	</button>

	{#if open}
		<button
			type="button"
			class="fixed inset-0 z-40 cursor-default"
			aria-label={t('nav.closeLanguageMenu')}
			onclick={closeMenu}
		></button>

		<div
			class="absolute right-0 top-full z-50 mt-2 w-44 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
			role="menu"
		>
			<div class="border-b border-slate-100 px-3 py-2.5">
				<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
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
							? 'bg-brand-50 text-brand-800'
							: 'text-slate-700 hover:bg-slate-100'}"
						onclick={() => pickLocale(locale)}
					>
						<span class="flex-1">{LOCALE_LABELS[locale]}</span>
						{#if locale === i18n.locale}
							<span class="text-brand-700" aria-hidden="true">✓</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
