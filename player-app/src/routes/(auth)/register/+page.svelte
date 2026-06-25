<script lang="ts">
	import AppLogo from '$lib/components/AppLogo.svelte';
	import DisplayNameField from '$lib/components/DisplayNameField.svelte';
	import IdentifierField from '$lib/components/IdentifierField.svelte';
	import PasswordField from '$lib/components/PasswordField.svelte';
	import { PASSWORD_MIN_LENGTH, validateRegisterPassword } from '$lib/validation/password';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let password = $state('');
</script>

<section class="space-y-6">
	<div class="flex flex-col items-center text-center">
		<AppLogo size={64} class="mb-4" />
		<h1 class="text-2xl font-semibold text-slate-900">Create account</h1>
		<p class="mt-2 text-sm text-slate-600">
			Register with email or phone. You need at least one unique identifier.
		</p>
	</div>

	{#if form?.message}
		<div
			class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
			role="alert"
		>
			{form.message}
		</div>
	{/if}

	<form method="POST" action="?/register" class="space-y-4">
		<DisplayNameField
			value={form?.values?.displayName ?? ''}
			serverError={form?.error?.displayName?.[0] ?? null}
		/>

		<IdentifierField
			value={form?.values?.identifier ?? ''}
			serverError={form?.error?.identifier?.[0] ?? null}
		/>

		<PasswordField
			bind:value={password}
			autocomplete="new-password"
			minlength={PASSWORD_MIN_LENGTH}
			validate={validateRegisterPassword}
			serverError={form?.error?.password?.[0] ?? null}
		/>

		<PasswordField
			id="confirmPassword"
			name="confirmPassword"
			label="Confirm password"
			matchValue={password}
			autocomplete="new-password"
			serverError={form?.error?.confirmPassword?.[0] ?? null}
		/>

		<button
			type="submit"
			class="w-full rounded-xl bg-brand-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
		>
			Create account
		</button>
	</form>

	<p class="text-center text-sm text-slate-600">
		Already have an account?
		<a href="/login" class="font-medium text-brand-700 hover:text-brand-800">Log in</a>
	</p>
</section>
