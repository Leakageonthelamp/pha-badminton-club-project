<script lang="ts">
	import type { ToastItem } from '$lib/toast/toast.svelte';

	let { item, onDismiss }: { item: ToastItem; onDismiss: () => void } = $props();

	const variantClass = $derived(
		{
			error: 'border-red-200 bg-red-50 text-red-800',
			success: 'border-green-200 bg-green-50 text-green-800',
			warning: 'border-amber-200 bg-amber-50 text-amber-900',
			info: 'border-brand-200 bg-brand-50 text-brand-900'
		}[item.variant]
	);

	const barClass = $derived(
		{
			error: 'bg-red-500',
			success: 'bg-green-500',
			warning: 'bg-amber-500',
			info: 'bg-brand-600'
		}[item.variant]
	);

	$effect(() => {
		const timer = setTimeout(onDismiss, item.duration);
		return () => clearTimeout(timer);
	});
</script>

<div
	class="toast-item overflow-hidden rounded-xl border shadow-lg {variantClass}"
	role="alert"
>
	<div class="flex items-start gap-2 px-4 py-3">
		<p class="min-w-0 flex-1 text-sm leading-snug font-medium">{item.message}</p>
		<button
			type="button"
			class="shrink-0 rounded-md px-1 text-lg leading-none opacity-60 transition hover:opacity-100"
			aria-label="Dismiss"
			onclick={onDismiss}
		>
			×
		</button>
	</div>
	<div class="h-1 bg-black/5">
		<div
			class="toast-ttl-bar h-full origin-left {barClass}"
			style:animation-duration="{item.duration}ms"
		></div>
	</div>
</div>
