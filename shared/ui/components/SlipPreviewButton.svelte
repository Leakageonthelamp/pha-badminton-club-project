<script lang="ts">
	import EyeIcon from '../icons/EyeIcon.svelte';

	let {
		onclick,
		label = 'View slip',
		class: className = ''
	}: { onclick: () => void; label?: string; class?: string } = $props();
</script>

<button
	type="button"
	{onclick}
	class="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50 active:bg-brand-100 {className}"
>
	<EyeIcon class="h-4 w-4" />
	{label}
</button>
