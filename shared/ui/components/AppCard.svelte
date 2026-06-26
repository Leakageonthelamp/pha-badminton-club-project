<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		class: className = '',
		padded = true,
		children
	}: {
		class?: string;
		padded?: boolean;
		children: Snippet;
	} = $props();
</script>

<div class="{padded ? 'app-card-padded' : 'app-card'} {className}">
	{@render children()}
</div>
