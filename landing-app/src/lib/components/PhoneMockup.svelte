<script lang="ts">
	import AppLogo from './AppLogo.svelte';

	// iPhone 17 Pro Max body: 78.0 × 163.4 mm (width × height).
	const bodyAspect = '78 / 163.4';
</script>

<div class="relative mx-auto w-full max-w-[272px]" aria-hidden="true">
	<div
		class="absolute -inset-4 rounded-[2.75rem] bg-linear-to-br from-brand-400/30 via-brand-500/10 to-indigo-400/20 blur-2xl"
	></div>

	<div
		class="relative flex w-full flex-col overflow-hidden rounded-[2.75rem] border-[7px] border-slate-900 bg-slate-900 shadow-2xl shadow-brand-900/20"
		style:aspect-ratio={bodyAspect}
	>
		<div class="absolute left-1/2 top-2.5 z-10 h-[22px] w-[30%] min-w-[72px] max-w-[96px] -translate-x-1/2 rounded-full bg-slate-900"></div>

		<div class="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 px-3 pb-5 pt-11">
			<div
				class="rounded-2xl bg-linear-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg"
			>
				<p class="text-[10px] font-medium uppercase tracking-wider text-brand-100/90">Welcome back</p>
				<p class="mt-1 text-base font-bold">Alex</p>
				<p class="mt-1 text-[11px] leading-snug text-brand-100/90">
					Join upcoming sessions or explore clubs near you.
				</p>
				<div class="mt-3 flex flex-wrap gap-1.5">
					<span class="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium">2 joined</span>
					<span class="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium">3 featured</span>
				</div>
			</div>

			<p class="mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
				Quick actions
			</p>
			<div class="mt-2 grid grid-cols-3 gap-2">
				{#each ['Sessions', 'History', 'Matches'] as label (label)}
					<div class="rounded-xl border border-slate-200 bg-white p-2 text-center shadow-sm">
						<div
							class="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-brand-500 to-brand-700"
						>
							<AppLogo size={16} tone="white" title="" />
						</div>
						<p class="text-[9px] font-medium leading-tight text-slate-700">{label}</p>
					</div>
				{/each}
			</div>

			<div class="mt-auto space-y-2.5 pt-4">
				<div class="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
					<p class="text-[10px] font-semibold text-slate-900">Friday Night Smash</p>
					<p class="mt-0.5 text-[9px] text-slate-500">Anton Smash Club · Sat 7:00 PM</p>
					<span
						class="mt-2 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-medium text-brand-800"
						>Open</span
					>
				</div>
				<div class="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
					<p class="text-[10px] font-semibold text-slate-900">Sunday Social Doubles</p>
					<p class="mt-0.5 text-[9px] text-slate-500">Smash House · Sun 4:00 PM</p>
					<span
						class="mt-2 inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-medium text-sky-800"
						>In progress</span
					>
				</div>
			</div>
		</div>
	</div>
</div>
