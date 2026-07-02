<script lang="ts">
	import { t } from '$lib/i18n';
	import FormToast from '@repo/ui/components/FormToast.svelte';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import SessionForm from '$lib/components/SessionForm.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<FormToast message={form?.message} variant="error" token={form?.message ?? ''} />

<section class="space-y-6">
	<DashboardHero
		title={t('sessions.edit.title')}
		subtitle={data.session.club?.name ?? t('sessions.edit.subtitle')}
	/>

	<AppCard class="space-y-4">
		<SessionForm
			mode="edit"
			managedClubs={data.managedClubs}
			shuttles={data.shuttles}
			session={data.session}
			submitLabel={t('clubs.detail.saveChanges')}
			loadingLabel={t('clubs.detail.saving')}
		/>
	</AppCard>
</section>
