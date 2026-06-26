<script lang="ts">
	let {
		displayName,
		avatarUrl = null,
		size = 'md'
	}: {
		displayName: string;
		avatarUrl?: string | null;
		size?: 'sm' | 'md' | 'lg' | 'xl';
	} = $props();

	let imageFailed = $state(false);

	const initial = $derived(displayName.slice(0, 1).toUpperCase() || '?');
	const sizeClass = $derived(
		size === 'sm'
			? 'h-9 w-9 text-sm'
			: size === 'lg'
				? 'h-11 w-11 text-base'
				: size === 'xl'
					? 'h-16 w-16 text-lg'
					: 'h-10 w-10 text-sm'
	);

	$effect(() => {
		avatarUrl;
		imageFailed = false;
	});
</script>

{#if avatarUrl && !imageFailed}
	<img
		src={avatarUrl}
		alt=""
		class="{sizeClass} shrink-0 rounded-full object-cover"
		referrerpolicy="no-referrer"
		onerror={() => (imageFailed = true)}
	/>
{:else}
	<div
		class="flex {sizeClass} shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800"
	>
		{initial}
	</div>
{/if}
