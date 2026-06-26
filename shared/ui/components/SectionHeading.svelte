<script lang="ts">
	let {
		title,
		class: className = ''
	}: {
		title: string;
		class?: string;
	} = $props();
</script>

<h2 class="app-section-heading {className}">{title}</h2>
