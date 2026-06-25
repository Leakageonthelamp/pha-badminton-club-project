<script lang="ts">
	import { enhance } from '$app/forms';
	import AppLogo from '$lib/components/AppLogo.svelte';
	import FacebookIcon from '$lib/components/icons/FacebookIcon.svelte';
	import GoogleIcon from '$lib/components/icons/GoogleIcon.svelte';
	import IdentifierField from '$lib/components/IdentifierField.svelte';
	import PasswordField from '$lib/components/PasswordField.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import FormToast from '$lib/components/FormToast.svelte';
	import { whileSubmitting } from '$lib/forms/submitting';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();

	let loginLoading = $state(false);
	let googleLoading = $state(false);
	let facebookLoading = $state(false);
</script>

<FormToast message={form?.message ?? data.error} variant="error" token={form?.message ?? data.error ?? ''} />

<section class="space-y-6">
	<div class="flex flex-col items-center text-center">
		<AppLogo size={64} class="mb-4" />
		<h1 class="text-2xl font-semibold text-slate-900">Log in</h1>
		<p class="mt-2 text-sm text-slate-600">Use email or phone number with your password.</p>
	</div>

	<form method="POST" action="?/login" class="space-y-4" use:enhance={whileSubmitting((v) => (loginLoading = v))}>
		<IdentifierField
			value={form?.values?.identifier ?? ''}
			serverError={form?.error?.identifier?.[0] ?? null}
		/>

		<PasswordField serverError={form?.error?.password?.[0] ?? null} />

		<SubmitButton loading={loginLoading} loadingLabel="Logging in…">Log in</SubmitButton>
	</form>

	<div class="space-y-3">
		<p class="text-center text-sm text-slate-500">Or continue with</p>
		<form
			method="POST"
			action="?/oauth"
			use:enhance={whileSubmitting((v) => (googleLoading = v))}
		>
			<input type="hidden" name="provider" value="google" />
			<SubmitButton
				variant="secondary"
				class="mb-3"
				loading={googleLoading}
				loadingLabel="Connecting…"
			>
				<GoogleIcon />
				Continue with Google
			</SubmitButton>
		</form>
		<form
			method="POST"
			action="?/oauth"
			use:enhance={whileSubmitting((v) => (facebookLoading = v))}
		>
			<input type="hidden" name="provider" value="facebook" />
			<SubmitButton variant="secondary" loading={facebookLoading} loadingLabel="Connecting…">
				<FacebookIcon />
				Continue with Facebook
			</SubmitButton>
		</form>
	</div>

	<p class="text-center text-sm text-slate-600">
		No account?
		<a href="/register" class="font-medium text-brand-700 hover:text-brand-800">Register</a>
	</p>
</section>
