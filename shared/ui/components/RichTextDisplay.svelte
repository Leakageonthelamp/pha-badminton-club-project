<script lang="ts">
	import { t } from '../i18n/i18n.svelte';

	let {
		html,
		class: className = 'prose prose-sm max-w-none text-slate-700'
	}: {
		html: string;
		class?: string;
	} = $props();
</script>

{#if html.trim()}
	<div class={className}>{@html html}</div>
{:else}
	<p class="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('richText.empty')}</p>
{/if}

<style>
	:global(.prose ul) {
		list-style: disc;
		padding-left: 1.25rem;
	}

	:global(.prose ol) {
		list-style: decimal;
		padding-left: 1.25rem;
	}

	:global(.prose a) {
		color: var(--color-brand-600);
		text-decoration: underline;
	}

	:global(.prose mark) {
		border-radius: 0.125rem;
		padding: 0 0.125rem;
	}
</style>
