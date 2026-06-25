<script lang="ts">
	import ToastItem from '$lib/components/ToastItem.svelte';
	import { toast } from '$lib/toast/toast.svelte';
</script>

<div
	class="pointer-events-none absolute inset-x-0 top-0 z-70 flex flex-col items-end px-4"
	style:padding-top="max(0.5rem, env(safe-area-inset-top))"
	aria-live="polite"
	aria-relevant="additions"
>
	<div class="pointer-events-auto w-full max-w-sm space-y-2">
		{#each toast.items as item (item.id)}
			<ToastItem {item} onDismiss={() => toast.dismiss(item.id)} />
		{/each}
	</div>
</div>
