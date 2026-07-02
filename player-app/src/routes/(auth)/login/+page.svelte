<script lang="ts">
	import { enhance } from '$app/forms';
	import AppLogo from '$lib/components/AppLogo.svelte';
	import FacebookIcon from '@repo/ui/icons/FacebookIcon.svelte';
	import GoogleIcon from '@repo/ui/icons/GoogleIcon.svelte';
	import IdentifierField from '$lib/components/IdentifierField.svelte';
	import PasswordField from '@repo/ui/components/PasswordField.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import FormToast from '@repo/ui/components/FormToast.svelte';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import { loadSignInPreference } from '@repo/ui/signInPreference';
	import { whileSubmitting } from '$lib/forms/submitting';
	import { onMount } from 'svelte';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();

	let loginLoading = $state(false);
	let googleLoading = $state(false);
	let facebookLoading = $state(false);
	let signInPreference = $state<ReturnType<typeof loadSignInPreference>>(null);

	onMount(() => {
		signInPreference = loadSignInPreference();
	});
</script>

<FormToast message={form?.message ?? data.error} variant="error" token={form?.message ?? data.error ?? ''} />

<section class="space-y-6">
	<DashboardHero title="Log in" subtitle="Use email or phone number with your password." footerCenter>
		<AppLogo size={48} tone="white" class="mx-auto opacity-95" />
	</DashboardHero>

	<AppCard class="space-y-4">
		<form method="POST" action="/login?/login" class="space-y-4" use:enhance={whileSubmitting((v) => (loginLoading = v))}>
			<IdentifierField
				value={form?.values?.identifier ?? ''}
				serverError={form?.error?.identifier?.[0] ?? null}
				preference={signInPreference}
			/>

			<PasswordField serverError={form?.error?.password?.[0] ?? null} />

			<SubmitButton loading={loginLoading} loadingLabel="Logging in…" variant="accent">Log in</SubmitButton>
		</form>

		<div class="space-y-3 border-t border-slate-100 pt-4">
			<p class="text-center text-sm text-slate-500">Or continue with</p>
			<form method="POST" action="/login?/oauth" onsubmit={() => (googleLoading = true)}>
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
			<form method="POST" action="/login?/oauth" onsubmit={() => (facebookLoading = true)}>
				<input type="hidden" name="provider" value="facebook" />
				<SubmitButton variant="secondary" loading={facebookLoading} loadingLabel="Connecting…">
					<FacebookIcon />
					Continue with Facebook
				</SubmitButton>
			</form>
		</div>
	</AppCard>

	<p class="text-center text-sm text-slate-600">
		No account?
		<a href="/register" class="font-medium text-brand-700 hover:text-brand-800">Register</a>
	</p>
</section>
