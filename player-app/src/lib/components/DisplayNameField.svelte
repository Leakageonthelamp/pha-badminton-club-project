<script lang="ts">
	import { DISPLAY_NAME_MAX, validateDisplayName } from '$lib/validation/displayName';

	let {
		id = 'displayName',
		name = 'displayName',
		value = '',
		serverError = null
	}: {
		id?: string;
		name?: string;
		value?: string;
		serverError?: string | null;
	} = $props();

	let input = $state('');
	let touched = $state(false);

	$effect(() => {
		input = value;
	});

	const clientError = $derived(touched ? validateDisplayName(input) : null);
	const errorMessage = $derived(serverError ?? clientError);

	const onBlur = () => {
		touched = true;
	};

	const onInput = (event: Event) => {
		const target = event.currentTarget as HTMLInputElement;
		input = target.value;
	};
</script>

<div>
	<label for={id} class="mb-2 block text-sm font-medium text-slate-700">Display name</label>
	<input
		{id}
		{name}
		type="text"
		autocomplete="nickname"
		required
		maxlength={DISPLAY_NAME_MAX}
		value={input}
		oninput={onInput}
		onblur={onBlur}
		aria-invalid={errorMessage ? 'true' : undefined}
		class="w-full rounded-xl border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-600/20 {errorMessage
			? 'border-red-400 focus:border-red-500'
			: 'border-slate-300 focus:border-brand-600'}"
	/>
	{#if errorMessage}
		<p class="mt-1 text-sm text-red-600">{errorMessage}</p>
	{/if}
</div>
