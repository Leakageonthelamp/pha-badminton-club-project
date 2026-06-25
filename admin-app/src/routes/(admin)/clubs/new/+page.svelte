<script lang="ts">
	import { enhance } from '$app/forms';
	import FormToast from '$lib/components/FormToast.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import { whileSubmitting } from '$lib/forms/submitting';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<FormToast message={form?.message} variant="error" token={form?.message ?? ''} />

<section class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold text-slate-900">Create club</h1>
		<p class="mt-2 text-sm text-slate-600">Set the club name, description, and session limit.</p>
	</div>

	<form
		method="POST"
		class="space-y-4 rounded-2xl border border-slate-200 bg-white p-4"
		use:enhance={whileSubmitting((v) => (loading = v))}
	>
		<div>
			<label for="name" class="mb-2 block text-sm font-medium text-slate-700">Club name</label>
			<input
				id="name"
				name="name"
				type="text"
				required
				maxlength="100"
				class="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
			/>
		</div>

		<div>
			<label for="description" class="mb-2 block text-sm font-medium text-slate-700">Description</label>
			<textarea
				id="description"
				name="description"
				rows="4"
				maxlength="1000"
				class="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
			></textarea>
		</div>

		<div>
			<label for="max_active_sessions" class="mb-2 block text-sm font-medium text-slate-700">
				Max active sessions
			</label>
			<input
				id="max_active_sessions"
				name="max_active_sessions"
				type="number"
				min="1"
				max="100"
				required
				value="3"
				inputmode="numeric"
				class="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
			/>
		</div>

		<SubmitButton loading={loading} loadingLabel="Creating…">Create club</SubmitButton>
	</form>
</section>
