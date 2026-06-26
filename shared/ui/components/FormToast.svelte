<script lang="ts">
	import { toast, type ToastVariant } from '../toast/toast.svelte';

	let {
		message,
		variant = 'error',
		token = ''
	}: {
		message?: string | null;
		variant?: ToastVariant;
		/** Primitive only — avoids $state proxy === mismatches */
		token?: string | number | boolean | null;
	} = $props();

	let lastKey = $state('');

	$effect(() => {
		const trimmed = message?.trim();
		if (!trimmed) return;

		const key = `${variant}\0${trimmed}\0${String(token ?? '')}`;
		if (key === lastKey) return;

		lastKey = key;
		toast.show(trimmed, variant);
	});
</script>
