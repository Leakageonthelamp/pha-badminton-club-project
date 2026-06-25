<script lang="ts">
	import EyeIcon from '$lib/components/icons/EyeIcon.svelte';
	import EyeOffIcon from '$lib/components/icons/EyeOffIcon.svelte';

	let {
		id = 'password',
		name = 'password',
		label = 'Password',
		autocomplete = 'current-password',
		minlength,
		validate,
		matchValue,
		value = $bindable(''),
		serverError = null
	}: {
		id?: string;
		name?: string;
		label?: string;
		autocomplete?: 'current-password' | 'new-password';
		minlength?: number;
		validate?: (value: string) => string | null;
		matchValue?: string;
		value?: string;
		serverError?: string | null;
	} = $props();

	let visible = $state(false);
	let touched = $state(false);

	const validationError = $derived(touched && validate ? validate(value) : null);
	const matchError = $derived(
		touched && matchValue !== undefined && value !== matchValue ? 'Passwords do not match' : null
	);
	const errorMessage = $derived(serverError ?? validationError ?? matchError);

	const toggleVisibility = () => {
		visible = !visible;
	};

	const onBlur = () => {
		touched = true;
	};

	const onInput = (event: Event) => {
		value = (event.currentTarget as HTMLInputElement).value;
	};
</script>

<div>
	<label for={id} class="mb-2 block text-sm font-medium text-slate-700">{label}</label>
	<div class="relative">
		<input
			{id}
			{name}
			type={visible ? 'text' : 'password'}
			{autocomplete}
			required
			{minlength}
			{value}
			oninput={onInput}
			onblur={onBlur}
			aria-invalid={errorMessage ? 'true' : undefined}
			class="w-full rounded-xl border px-4 py-3 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-brand-600/20 {errorMessage
				? 'border-red-400 focus:border-red-500'
				: 'border-slate-300 focus:border-brand-600'}"
		/>
		<button
			type="button"
			class="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 transition hover:text-slate-700 focus:outline-none focus-visible:text-brand-700"
			aria-label={visible ? 'Hide password' : 'Show password'}
			aria-pressed={visible}
			onclick={toggleVisibility}
		>
			{#if visible}
				<EyeOffIcon />
			{:else}
				<EyeIcon />
			{/if}
		</button>
	</div>
	{#if errorMessage}
		<p class="mt-1 text-sm text-red-600">{errorMessage}</p>
	{/if}
</div>
