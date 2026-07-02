<script lang="ts">
	import { t } from '$lib/i18n';
	import EmptyState from '@repo/ui/components/EmptyState.svelte';
</script>

<section class="app-card-padded flex min-h-48 items-center justify-center">
	<EmptyState message={t('masterDetail.selectSession')} />
</section>
