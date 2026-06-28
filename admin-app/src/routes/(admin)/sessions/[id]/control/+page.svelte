<script lang="ts">
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import { sessionStatusBadgeClass, sessionStatusLabel } from '$lib/types/session';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<section class="space-y-6">
	<DashboardHero
		eyebrow="Session control"
		title={data.session.name}
		subtitle="Live session controls and match flow will appear here."
	>
		<span class="rounded-full px-2 py-0.5 text-xs font-medium {sessionStatusBadgeClass(data.session.status)}">
			{sessionStatusLabel(data.session.status)}
		</span>
	</DashboardHero>
</section>
