<script lang="ts">
	import AppLogo from '$lib/components/AppLogo.svelte';
	import { appConfig } from '$lib/config/app';
</script>

<section class="flex min-h-full flex-col items-center justify-center py-12 text-center">
	<AppLogo size={72} class="mb-6" />
	<p class="text-sm font-medium text-brand-700">Maintenance</p>
	<h1 class="mt-2 text-2xl font-semibold text-slate-900">{appConfig.name} is temporarily unavailable</h1>
	<p class="mt-3 max-w-sm text-base leading-relaxed text-slate-600">
		We are investigating an issue with our backend services. Please come back later.
	</p>
	<p class="mt-6 text-xs text-slate-400">If this keeps happening, contact your club admin.</p>
</section>
