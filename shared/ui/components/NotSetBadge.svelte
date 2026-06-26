<script lang="ts">
	let { class: className = '' }: { class?: string } = $props();
</script>

<span
	class="inline-flex shrink-0 items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200/80 {className}"
>
	Not set
</span>
