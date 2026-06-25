<script lang="ts">
	import { enhance } from '$app/forms';
	import AppLogo from '$lib/components/AppLogo.svelte';
	import DisplayNameField from '$lib/components/DisplayNameField.svelte';
	import IdentifierField from '$lib/components/IdentifierField.svelte';
	import PasswordField from '$lib/components/PasswordField.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import FormToast from '$lib/components/FormToast.svelte';
	import { whileSubmitting } from '$lib/forms/submitting';
	import { PASSWORD_MIN_LENGTH, validateRegisterPassword } from '$lib/validation/password';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let password = $state('');
	let registerLoading = $state(false);
</script>

<FormToast message={form?.message} variant="error" token={form?.message ?? ''} />

<section class="space-y-6">
	<div class="flex flex-col items-center text-center">
		<AppLogo size={64} class="mb-4" />
		<h1 class="text-2xl font-semibold text-slate-900">Create account</h1>
		<p class="mt-2 text-sm text-slate-600">
			Register with email or phone. You need at least one unique identifier.
		</p>
	</div>

	<form
		method="POST"
		action="?/register"
		class="space-y-4"
		use:enhance={whileSubmitting((v) => (registerLoading = v))}
	>
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

		<SubmitButton loading={registerLoading} loadingLabel="Creating account…">
			Create account
		</SubmitButton>
	</form>

	<p class="text-center text-sm text-slate-600">
		Already have an account?
		<a href="/login" class="font-medium text-brand-700 hover:text-brand-800">Log in</a>
	</p>
</section>
