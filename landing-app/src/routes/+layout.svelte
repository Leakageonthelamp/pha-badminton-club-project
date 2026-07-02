<script lang="ts">
	import '../app.css';
	import { landingConfig } from '$lib/config';
	import { t } from '$lib/i18n';

	let { children }: { children: import('svelte').Snippet } = $props();

	const pageTitle = $derived(t('landing.meta.title', { appName: landingConfig.appName }));
	const pageDescription = $derived(t('landing.meta.description'));
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
</svelte:head>

{@render children()}
