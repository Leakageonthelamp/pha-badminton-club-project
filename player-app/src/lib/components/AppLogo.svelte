<script lang="ts">
	let {
		size = 40,
		title = 'PH Badminton Club',
		class: className = ''
	}: {
		size?: number;
		title?: string;
		class?: string;
	} = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 48 48"
	class={className}
	role="img"
	aria-label={title}
>
	<circle cx="24" cy="24" r="24" fill="var(--app-accent, #964ac0)" />
	<circle cx="24" cy="14.5" r="3.2" fill="#ffffff" />
	<path
		d="M24 17.8C18.8 19.2 15.8 22.4 15.2 26L24 37.2L32.8 26C32.2 22.4 29.2 19.2 24 17.8Z"
		fill="#ffffff"
	/>
</svg>
