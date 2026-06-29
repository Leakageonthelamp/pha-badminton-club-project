<script lang="ts">
	let { size = 'md' }: { size?: 'md' | 'lg' } = $props();
</script>

<div class="app-court-icon app-court-icon--{size}" aria-hidden="true">
	<div class="app-court-icon-net-h"></div>
	<div class="app-court-icon-net-v"></div>
</div>
