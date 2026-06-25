<script lang="ts">
	import AppLogo from '$lib/components/AppLogo.svelte';
	import FacebookIcon from '$lib/components/icons/FacebookIcon.svelte';
	import GoogleIcon from '$lib/components/icons/GoogleIcon.svelte';
	import IdentifierField from '$lib/components/IdentifierField.svelte';
	import PasswordField from '$lib/components/PasswordField.svelte';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();
</script>

<section class="space-y-6">
	<div class="flex flex-col items-center text-center">
		<AppLogo size={64} class="mb-4" />
		<h1 class="text-2xl font-semibold text-slate-900">Log in</h1>
		<p class="mt-2 text-sm text-slate-600">Use email or phone number with your password.</p>
	</div>

	{#if form?.message || data.error}
		<div
			class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
			role="alert"
		>
			{form?.message ?? data.error}
		</div>
	{/if}

	<form method="POST" action="?/login" class="space-y-4">
		<IdentifierField
			value={form?.values?.identifier ?? ''}
			serverError={form?.error?.identifier?.[0] ?? null}
		/>

		<PasswordField serverError={form?.error?.password?.[0] ?? null} />

		<button
			type="submit"
			class="w-full rounded-xl bg-brand-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
		>
			Log in
		</button>
	</form>

	<div class="space-y-3">
		<p class="text-center text-sm text-slate-500">Or continue with</p>
		<form method="POST" action="?/oauth">
			<input type="hidden" name="provider" value="google" />
			<button
				type="submit"
				class="mb-3 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
			>
				<GoogleIcon />
				Continue with Google
			</button>
		</form>
		<form method="POST" action="?/oauth">
			<input type="hidden" name="provider" value="facebook" />
			<button
				type="submit"
				class="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
			>
				<FacebookIcon />
				Continue with Facebook
			</button>
		</form>
	</div>

	<p class="text-center text-sm text-slate-600">
		No account?
		<a href="/register" class="font-medium text-brand-700 hover:text-brand-800">Register</a>
	</p>
</section>
