<script lang="ts">
	import HomeIcon from '../icons/HomeIcon.svelte';

	let {
		href,
		label = 'Go home'
	}: {
		href: string;
		label?: string;
	} = $props();
</script>

<a
	{href}
	aria-label={label}
	class="inline-flex items-center justify-center rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
>
	<HomeIcon class="h-6 w-6" />
</a>
