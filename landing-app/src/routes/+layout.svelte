<script lang="ts">
	import '../app.css';
	import { landingConfig } from '$lib/config';

	let { children }: { children: import('svelte').Snippet } = $props();
</script>

<svelte:head>
	<title>{landingConfig.appName} — Badminton club sessions, matches & payments</title>
	<meta
		name="description"
		content="Discover clubs, join 2v2 badminton sessions, track live matches, split costs with PromptPay, and install the Antonsmash player app on any device."
	/>
</svelte:head>

{@render children()}
