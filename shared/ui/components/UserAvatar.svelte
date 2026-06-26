<script lang="ts">
	let {
		displayName,
		avatarUrl = null,
		size = 'md'
	}: {
		displayName: string;
		avatarUrl?: string | null;
		size?: 'sm' | 'md';
	} = $props();

	const initial = $derived(displayName.slice(0, 1).toUpperCase() || '?');
	const sizeClass = $derived(size === 'sm' ? 'h-9 w-9 text-sm' : 'h-10 w-10 text-sm');
</script>

{#if avatarUrl}
	<img src={avatarUrl} alt="" class="{sizeClass} shrink-0 rounded-full object-cover" />
{:else}
	<div
		class="flex {sizeClass} shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800"
	>
		{initial}
	</div>
{/if}
