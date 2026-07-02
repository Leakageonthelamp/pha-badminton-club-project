<script lang="ts">
	import AppLogo from '$lib/components/AppLogo.svelte';
	import FeatureCard from '$lib/components/FeatureCard.svelte';
	import InstallQr from '$lib/components/InstallQr.svelte';
	import LangSwitch from '$lib/components/LangSwitch.svelte';
	import PhoneMockup from '$lib/components/PhoneMockup.svelte';
	import { landingConfig } from '$lib/config';
	import { t } from '$lib/i18n';
	import BanknotesIcon from '$lib/icons/BanknotesIcon.svelte';
	import CalendarIcon from '$lib/icons/CalendarIcon.svelte';
	import ClockIcon from '$lib/icons/ClockIcon.svelte';
	import DevicePhoneIcon from '$lib/icons/DevicePhoneIcon.svelte';
	import Squares2x2Icon from '$lib/icons/Squares2x2Icon.svelte';
	import TrophyIcon from '$lib/icons/TrophyIcon.svelte';
	import UserGroupIcon from '$lib/icons/UserGroupIcon.svelte';

	const { appName, playerAppUrl } = landingConfig;

	const features = [
		{
			titleKey: 'landing.features.discover.title',
			descriptionKey: 'landing.features.discover.description',
			icon: UserGroupIcon,
			accent: 'brand' as const
		},
		{
			titleKey: 'landing.features.join.title',
			descriptionKey: 'landing.features.join.description',
			icon: CalendarIcon,
			accent: 'secondary' as const
		},
		{
			titleKey: 'landing.features.live.title',
			descriptionKey: 'landing.features.live.description',
			icon: Squares2x2Icon,
			accent: 'violet' as const
		},
		{
			titleKey: 'landing.features.match.title',
			descriptionKey: 'landing.features.match.description',
			icon: TrophyIcon,
			accent: 'secondary' as const
		},
		{
			titleKey: 'landing.features.history.title',
			descriptionKey: 'landing.features.history.description',
			icon: ClockIcon,
			accent: 'sky' as const
		},
		{
			titleKey: 'landing.features.payment.title',
			descriptionKey: 'landing.features.payment.description',
			icon: BanknotesIcon,
			accent: 'indigo' as const
		},
		{
			titleKey: 'landing.features.pwa.title',
			descriptionKey: 'landing.features.pwa.description',
			icon: DevicePhoneIcon,
			accent: 'brand' as const
		}
	];

	const steps = [
		{
			step: '1',
			titleKey: 'landing.how.step1.title',
			descriptionKey: 'landing.how.step1.description'
		},
		{
			step: '2',
			titleKey: 'landing.how.step2.title',
			descriptionKey: 'landing.how.step2.description'
		},
		{
			step: '3',
			titleKey: 'landing.how.step3.title',
			descriptionKey: 'landing.how.step3.description'
		}
	];
</script>

<header class="landing-nav">
	<div class="landing-container flex h-16 items-center justify-between gap-4">
		<a href="/" class="flex items-center gap-2.5 font-semibold text-slate-900">
			<AppLogo size={36} title={appName} />
			<span>{appName}</span>
		</a>
		<div class="flex items-center gap-2">
			<LangSwitch />
			<a href="#download" class="landing-btn-accent shrink-0 px-5 py-2.5 text-sm">
				{t('landing.nav.getApp')}
			</a>
		</div>
	</div>
</header>

<main>
	<section class="landing-gradient-hero overflow-hidden pb-16 pt-12 sm:pb-24 sm:pt-16">
		<div class="landing-container">
			<div class="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
				<div class="max-w-xl">
					<p
						class="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-800"
					>
						{t('landing.hero.badge')}
					</p>
					<h1 class="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
						{t('landing.hero.titleLine1')}<br />
						<span class="bg-linear-to-r from-brand-600 to-brand-800 bg-clip-text text-transparent">
							{t('landing.hero.titleHighlight')}
						</span>
						{' '}{t('landing.hero.titleLine2')}
					</h1>
					<p class="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl">
						{t('landing.hero.lead', { appName })}
					</p>
					<div class="mt-8 flex flex-wrap gap-3">
						<a href="#download" class="landing-btn-accent">{t('landing.hero.ctaPrimary')}</a>
						<a href="#features" class="landing-btn-secondary">{t('landing.hero.ctaSecondary')}</a>
					</div>
				</div>

				<div class="flex justify-center lg:justify-end">
					<PhoneMockup />
				</div>
			</div>
		</div>
	</section>

	<section id="features" class="border-t border-slate-200/80 bg-white py-16 sm:py-24">
		<div class="landing-container">
			<div class="max-w-2xl">
				<h2 class="landing-section-title">{t('landing.features.title')}</h2>
				<p class="landing-section-lead">{t('landing.features.lead')}</p>
			</div>

			<div class="landing-feature-grid mt-12">
				{#each features as feature (feature.titleKey)}
					<FeatureCard
						title={t(feature.titleKey)}
						description={t(feature.descriptionKey)}
						icon={feature.icon}
						accent={feature.accent}
					/>
				{/each}
			</div>
		</div>
	</section>

	<section class="border-t border-slate-200/80 bg-slate-50 py-16 sm:py-24">
		<div class="landing-container">
			<div class="mx-auto max-w-2xl text-center">
				<h2 class="landing-section-title">{t('landing.how.title')}</h2>
				<p class="landing-section-lead mx-auto">{t('landing.how.lead')}</p>
			</div>

			<div class="landing-step-grid mt-14">
				{#each steps as item, index (item.step)}
					<div class="relative text-center">
						<div
							class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br text-xl font-extrabold shadow-lg {index %
								2 ===
							0
								? 'from-brand-500 to-brand-700 text-white shadow-brand-600/25'
								: 'from-secondary-400 to-secondary-600 text-secondary-900 shadow-secondary-500/30'}"
						>
							{item.step}
						</div>
						<h3 class="mt-5 text-lg font-semibold text-slate-900">{t(item.titleKey)}</h3>
						<p class="mt-2 text-sm leading-relaxed text-slate-600">{t(item.descriptionKey)}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section id="download" class="border-t border-slate-200/80 bg-white py-16 sm:py-24">
		<div class="landing-container">
			<div
				class="overflow-hidden rounded-[2rem] bg-linear-to-br from-brand-600 via-brand-700 to-brand-900 px-6 py-12 sm:px-12 sm:py-16"
			>
				<div class="grid items-center gap-12 lg:grid-cols-2">
					<div class="text-white">
						<h2 class="text-3xl font-bold tracking-tight sm:text-4xl">
							{t('landing.download.title', { appName })}
						</h2>
						<p class="mt-4 text-lg leading-relaxed text-brand-100">
							{t('landing.download.lead')}
						</p>
						<ul class="mt-6 space-y-2 text-sm text-brand-100/95">
							<li class="flex items-start gap-2">
								<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-200"></span>
								<span>{t('landing.download.hintPhone')}</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-200"></span>
								<span>{t('landing.download.hintLaptop')}</span>
							</li>
						</ul>
						<a
							href={playerAppUrl}
							class="landing-btn-secondary mt-8 border-white/30 bg-white/10 text-white hover:border-white/50 hover:bg-white/20"
							target="_blank"
							rel="noopener noreferrer"
						>
							{t('landing.download.openDevice')}
						</a>
					</div>

					<div class="landing-qr-card mx-auto w-full max-w-sm">
						<InstallQr url={playerAppUrl} />
						<p class="mt-4 text-center text-xs text-slate-500">
							{t('landing.download.linksTo')}
							<span class="font-medium text-slate-700">{playerAppUrl}</span>
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>
</main>

<footer class="border-t border-slate-200 bg-slate-50 py-10">
	<div
		class="landing-container flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-center"
	>
		<div class="flex items-center gap-2.5">
			<AppLogo size={28} title={appName} />
			<div>
				<p class="font-semibold text-slate-900">{appName}</p>
				<p class="text-sm text-slate-500">{t('landing.footer.tagline')}</p>
			</div>
		</div>
		<a
			href={playerAppUrl}
			class="text-sm font-medium text-brand-700 hover:text-brand-900"
			target="_blank"
			rel="noopener noreferrer"
		>
			{t('landing.footer.openPlayerApp')}
		</a>
	</div>
</footer>
