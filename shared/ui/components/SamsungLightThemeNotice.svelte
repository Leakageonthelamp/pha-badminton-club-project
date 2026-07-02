<script lang="ts">
	const STORAGE_KEY = 'antonsmash-samsung-light-notice-dismissed';

	let visible = $state(false);

	$effect(() => {
		if (typeof window === 'undefined') return;
		if (!/SamsungBrowser/i.test(navigator.userAgent)) return;
		if (localStorage.getItem(STORAGE_KEY)) return;
		visible = true;
	});

	function dismiss() {
		visible = false;
		try {
			localStorage.setItem(STORAGE_KEY, '1');
		} catch {
			/* ponytail: private mode may block storage */
		}
	}
</script>

{#if visible}
	<div class="app-location-prompt app-location-prompt--warning mb-4" role="status">
		<div class="min-w-0 flex-1">
			<p class="font-medium text-amber-900">Samsung Internet dark mode</p>
			<p class="mt-1 text-sm text-amber-800">
				This app uses a light theme. If colors look inverted, open Samsung Internet settings and
				turn off <strong>Force dark mode for web content</strong>.
			</p>
		</div>
		<button
			type="button"
			class="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100/80"
			onclick={dismiss}
		>
			Dismiss
		</button>
	</div>
{/if}
