<script lang="ts">
	import { t } from '$lib/i18n';
	import { getIdentifierKind, validateIdentifier } from '$lib/validation/identifier';
	import type { SignInPreference } from '@repo/ui/signInPreference';

	let {
		id = 'identifier',
		name = 'identifier',
		value = '',
		serverError = null,
		preference = null
	}: {
		id?: string;
		name?: string;
		value?: string;
		serverError?: string | null;
		preference?: SignInPreference | null;
	} = $props();

	let input = $state('');
	let touched = $state(false);

	$effect(() => {
		input = value;
	});

	const kind = $derived(getIdentifierKind(input));
	const clientError = $derived(touched ? validateIdentifier(input) : null);
	const errorMessage = $derived(serverError ?? clientError);
	const inputType = $derived(kind === 'email' ? 'email' : kind === 'phone' ? 'tel' : 'text');
	const inputMode = $derived(kind === 'phone' ? 'tel' : kind === 'email' ? 'email' : 'text');
	const label = $derived(
		preference === 'email'
			? t('auth.field.identifierEmail')
			: preference === 'phone'
				? t('auth.field.identifierPhone')
				: t('auth.field.identifier')
	);
	const placeholder = $derived(
		preference === 'email'
			? t('auth.field.placeholder.email')
			: preference === 'phone'
				? t('auth.field.placeholder.phone')
				: t('auth.field.placeholder.both')
	);

	const onBlur = () => {
		touched = true;
	};

	const onInput = (event: Event) => {
		const target = event.currentTarget as HTMLInputElement;
		input = target.value;
	};
</script>

<div>
	<label for={id} class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-600">{label}</label>
	<input
		{id}
		{name}
		type={inputType}
		inputmode={inputMode}
		autocomplete="username"
		required
		value={input}
		oninput={onInput}
		onblur={onBlur}
		aria-invalid={errorMessage ? 'true' : undefined}
		class="w-full rounded-xl border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-600/20 {errorMessage
			? 'border-red-400 focus:border-red-500'
			: 'border-slate-300 dark:border-slate-600 focus:border-brand-600'}"
		{placeholder}
	/>
	{#if errorMessage}
		<p class="mt-1 text-sm text-red-600">{errorMessage}</p>
	{/if}
</div>
