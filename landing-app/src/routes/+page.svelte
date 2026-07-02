<script lang="ts">
	import AppLogo from '$lib/components/AppLogo.svelte';
	import FeatureCard from '$lib/components/FeatureCard.svelte';
	import InstallQr from '$lib/components/InstallQr.svelte';
	import PhoneMockup from '$lib/components/PhoneMockup.svelte';
	import { landingConfig } from '$lib/config';
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
			title: 'Discover nearby clubs & sessions',
			description:
				'Browse active clubs and upcoming open sessions sorted by distance when you share your location.',
			icon: UserGroupIcon,
			accent: 'brand' as const
		},
		{
			title: 'Join with waiting list & queue',
			description:
				'Reserve your spot on popular sessions. Get confirmed by the club or wait in the queue when sessions fill up.',
			icon: CalendarIcon,
			accent: 'secondary' as const
		},
		{
			title: 'Live session court grid',
			description:
				'See real-time court occupancy, player activity, and match status while you play — all from your phone.',
			icon: Squares2x2Icon,
			accent: 'violet' as const
		},
		{
			title: 'Match invites & peer scoring',
			description:
				'Accept 2v2 match invites, submit rally scores, and confirm results with your teammates using official 15/21-point rules.',
			icon: TrophyIcon,
			accent: 'secondary' as const
		},
		{
			title: 'Session & match history',
			description:
				'Review past sessions you joined and every match you played — scores, wins, and activity at a glance.',
			icon: ClockIcon,
			accent: 'sky' as const
		},
		{
			title: 'Split costs with PromptPay',
			description:
				'Pay your share of court and shuttle fees with a generated PromptPay QR. Upload your slip and track payment status.',
			icon: BanknotesIcon,
			accent: 'indigo' as const
		},
		{
			title: 'Installable PWA on any device',
			description:
				'Add Antonsmash to your home screen on phone, tablet, or laptop for a full-screen app experience — no app store required.',
			icon: DevicePhoneIcon,
			accent: 'brand' as const
		}
	];

	const steps = [
		{
			step: '1',
			title: 'Find a club',
			description: 'Explore clubs and upcoming sessions near you, then pick a time that works.'
		},
		{
			step: '2',
			title: 'Join & play',
			description: 'Get confirmed, show up, accept match invites, and log scores with your group.'
		},
		{
			step: '3',
			title: 'Split the bill',
			description: 'Scan PromptPay, pay your court and shuttle share, and you are done.'
		}
	];
</script>

<header class="landing-nav">
	<div class="landing-container flex h-16 items-center justify-between gap-4">
		<a href="/" class="flex items-center gap-2.5 font-semibold text-slate-900">
			<AppLogo size={36} title={appName} />
			<span>{appName}</span>
		</a>
		<a href="#download" class="landing-btn-accent shrink-0 px-5 py-2.5 text-sm">Get the app</a>
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
						Player app for badminton clubs
					</p>
					<h1 class="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
						Your club sessions,<br />
						<span class="bg-linear-to-r from-brand-600 to-brand-800 bg-clip-text text-transparent"
							>matches & payments</span
						>
						in one app.
					</h1>
					<p class="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl">
						{appName} helps players discover sessions, join 2v2 matches, track live court activity,
						and split costs — all from an installable app on your phone, tablet, or laptop.
					</p>
					<div class="mt-8 flex flex-wrap gap-3">
						<a href="#download" class="landing-btn-accent">Get the app</a>
						<a href="#features" class="landing-btn-secondary">See features</a>
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
				<h2 class="landing-section-title">Everything you need to play</h2>
				<p class="landing-section-lead">
					From finding a session to settling the bill — built for real club badminton, not generic
					sports apps.
				</p>
			</div>

			<div class="landing-feature-grid mt-12">
				{#each features as feature (feature.title)}
					<FeatureCard
						title={feature.title}
						description={feature.description}
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
				<h2 class="landing-section-title">How it works</h2>
				<p class="landing-section-lead mx-auto">
					Three steps from browsing to playing to paying — no spreadsheets, no chasing cash.
				</p>
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
						<h3 class="mt-5 text-lg font-semibold text-slate-900">{item.title}</h3>
						<p class="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
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
						<h2 class="text-3xl font-bold tracking-tight sm:text-4xl">Get {appName} on your device</h2>
						<p class="mt-4 text-lg leading-relaxed text-brand-100">
							Scan the QR code with your phone camera, or open the link on this device. Install the
							app to your home screen for the best experience — works on mobile, tablet, and
							desktop browsers that support PWAs.
						</p>
						<ul class="mt-6 space-y-2 text-sm text-brand-100/95">
							<li class="flex items-start gap-2">
								<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-200"></span>
								<span>Phone & tablet — scan QR or tap the link, then “Add to Home Screen”</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-200"></span>
								<span>Laptop — open in Chrome or Edge and install from the browser menu</span>
							</li>
						</ul>
						<a
							href={playerAppUrl}
							class="landing-btn-secondary mt-8 border-white/30 bg-white/10 text-white hover:border-white/50 hover:bg-white/20"
							target="_blank"
							rel="noopener noreferrer"
						>
							Open on this device
						</a>
					</div>

					<div class="landing-qr-card mx-auto w-full max-w-sm">
						<InstallQr url={playerAppUrl} label="Scan to open the player app" />
						<p class="mt-4 text-center text-xs text-slate-500">
							Links to <span class="font-medium text-slate-700">{playerAppUrl}</span>
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
				<p class="text-sm text-slate-500">2v2 badminton club sessions, matches & payments</p>
			</div>
		</div>
		<a
			href={playerAppUrl}
			class="text-sm font-medium text-brand-700 hover:text-brand-900"
			target="_blank"
			rel="noopener noreferrer"
		>
			Open player app →
		</a>
	</div>
</footer>
