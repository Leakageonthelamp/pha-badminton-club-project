<script lang="ts">
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import { page } from '$app/state';

	const sessionId = $derived(page.params.id ?? '');
</script>

<section class="space-y-6">
	<DashboardHero
		eyebrow="Live session"
		title="Coming soon"
		subtitle="Live session controls and match flow will appear here."
	>
		<span class="app-hero-stat">Session {sessionId.slice(0, 8)}…</span>
	</DashboardHero>
</section>
