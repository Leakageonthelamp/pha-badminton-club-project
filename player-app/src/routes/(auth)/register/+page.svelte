<script lang="ts">
	import { enhance } from '$app/forms';
	import AppLogo from '$lib/components/AppLogo.svelte';
	import DisplayNameField from '$lib/components/DisplayNameField.svelte';
	import IdentifierField from '$lib/components/IdentifierField.svelte';
	import PasswordField from '@repo/ui/components/PasswordField.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import FormToast from '@repo/ui/components/FormToast.svelte';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import { whileSubmitting } from '$lib/forms/submitting';
	import { PASSWORD_MIN_LENGTH, validateRegisterPassword } from '$lib/validation/password';
	import { t } from '@repo/ui/i18n';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let password = $state('');
	let registerLoading = $state(false);
</script>

<FormToast message={form?.message} variant="error" token={form?.message ?? ''} />

<section class="space-y-6">
	<DashboardHero
		title={t('auth.register.title')}
		subtitle={t('auth.register.subtitle')}
		footerCenter
	>
		<AppLogo size={48} tone="white" class="mx-auto opacity-95" />
	</DashboardHero>

	<AppCard class="space-y-4">
		<form
			method="POST"
			action="/register?/register"
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
				label={t('auth.register.confirmPassword')}
				matchValue={password}
				autocomplete="new-password"
				serverError={form?.error?.confirmPassword?.[0] ?? null}
			/>

			<SubmitButton loading={registerLoading} loadingLabel={t('auth.register.submitting')} variant="accent">
				{t('auth.register.submit')}
			</SubmitButton>
		</form>
	</AppCard>

	<p class="text-center text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
		{t('auth.register.hasAccount')}
		<a href="/login" class="font-medium text-brand-700 dark:text-brand-300 hover:text-brand-800">
			{t('auth.register.loginLink')}
		</a>
	</p>
</section>
