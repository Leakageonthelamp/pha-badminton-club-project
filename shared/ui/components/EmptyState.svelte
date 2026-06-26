<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		message,
		children
	}: {
		message: string;
		children?: Snippet;
	} = $props();
</script>

<div class="app-empty">
	<p class="text-slate-600">{message}</p>
	{#if children}
		<div class="mt-3">
			{@render children()}
		</div>
	{/if}
</div>
