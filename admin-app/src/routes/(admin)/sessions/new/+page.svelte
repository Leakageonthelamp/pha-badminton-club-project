<script lang="ts">
	import { t } from '$lib/i18n';
	import FormToast from '@repo/ui/components/FormToast.svelte';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import SessionForm from '$lib/components/SessionForm.svelte';
	import { clubWorkspaceState } from '$lib/clubWorkspace.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const activeClub = $derived(
		data.managedClubs.find((club) => club.id === clubWorkspaceState.selectedClubId) ??
			data.managedClubs[0] ??
			null
	);
</script>

<FormToast message={form?.message} variant="error" token={form?.message ?? ''} />

<section class="space-y-6">
	<DashboardHero
		title={t('dashboard.club.createSession.title')}
		subtitle={activeClub
			? `Schedule a new badminton session for ${activeClub.name}.`
			: 'Schedule a new badminton session.'}
	/>

	<AppCard class="space-y-4">
		<SessionForm
			mode="create"
			managedClubs={data.managedClubs}
			shuttles={data.shuttles}
			submitLabel={t('dashboard.club.createSession.title')}
			loadingLabel={t('clubs.create.submitting')}
		/>
	</AppCard>
</section>
