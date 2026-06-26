<script lang="ts">
	import ToastItem from './ToastItem.svelte';
	import { toast } from '../toast/toast.svelte';
</script>

<div class="app-toast-host" aria-live="polite" aria-relevant="additions">
	<div class="app-toast-stack">
		{#each toast.items as item (item.id)}
			<ToastItem {item} onDismiss={() => toast.dismiss(item.id)} />
		{/each}
	</div>
</div>
