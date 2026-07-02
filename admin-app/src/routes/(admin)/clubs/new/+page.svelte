<script lang="ts">
	import { enhance } from '$app/forms';
	import FormToast from '@repo/ui/components/FormToast.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
	import { CLUB_DESCRIPTION_MAX_LENGTH, CLUB_NAME_MAX_LENGTH } from '$lib/config/club';
	import { whileSubmitting } from '$lib/forms/submitting';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
	let isActive = $state(true);
	let description = $state('');

	const fieldErrors = $derived(
		form && 'fieldErrors' in form
			? (form.fieldErrors as
					| {
							name?: string[];
							description?: string[];
							max_active_sessions?: string[];
							max_admins?: string[];
					  }
					| undefined)
			: null
	);

	const values = $derived(
		form && 'values' in form
			? (form.values as
					| {
							name?: string;
							description?: string;
							max_active_sessions?: string;
							max_admins?: string;
					  }
					| undefined)
			: null
	);

	$effect.pre(() => {
		if (values?.description !== undefined) {
			description = values.description;
		}
	});
</script>

<FormToast message={form?.message} variant="error" token={form?.message ?? ''} />

<section class="space-y-6">
	<DashboardHero title="Create club" subtitle="Set the club name, description, and session limit." />

	<AppCard class="space-y-4">
	<form
		method="POST"
		class="space-y-4"
		use:enhance={whileSubmitting((v) => (loading = v))}
	>
		<div>
			<label for="name" class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-600">Club name</label>
			<input
				id="name"
				name="name"
				type="text"
				required
				maxlength={CLUB_NAME_MAX_LENGTH}
				value={values?.name ?? ''}
				class="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
			/>
			<p class="mt-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
				Required. Up to {CLUB_NAME_MAX_LENGTH} characters.
			</p>
			{#if fieldErrors?.name?.[0]}
				<p class="mt-2 text-sm text-red-600">{fieldErrors.name[0]}</p>
			{/if}
		</div>

		<RichTextEditor
			name="description"
			bind:value={description}
			disabled={loading}
			label="Description"
		/>
		<p class="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
			Optional. Up to {CLUB_DESCRIPTION_MAX_LENGTH} characters of visible text.
		</p>
		{#if fieldErrors?.description?.[0]}
			<p class="text-sm text-red-600">{fieldErrors.description[0]}</p>
		{/if}

		<div>
			<label for="max_active_sessions" class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-600">
				Max active sessions
			</label>
			<input
				id="max_active_sessions"
				name="max_active_sessions"
				type="number"
				min="1"
				max={data.maxActiveSessionsLimit}
				required
				value={values?.max_active_sessions ?? '3'}
				inputmode="numeric"
				class="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
			/>
			<p class="mt-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
				Whole number from 1 to {data.maxActiveSessionsLimit}.
			</p>
			{#if fieldErrors?.max_active_sessions?.[0]}
				<p class="mt-2 text-sm text-red-600">{fieldErrors.max_active_sessions[0]}</p>
			{/if}
		</div>

		<div>
			<label for="max_admins" class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-600">
				Max club admins
			</label>
			<input
				id="max_admins"
				name="max_admins"
				type="number"
				min="1"
				max={data.maxAdminsLimit}
				required
				value={values?.max_admins ?? '3'}
				inputmode="numeric"
				class="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
			/>
			<p class="mt-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
				Whole number from 1 to {data.maxAdminsLimit}.
			</p>
			{#if fieldErrors?.max_admins?.[0]}
				<p class="mt-2 text-sm text-red-600">{fieldErrors.max_admins[0]}</p>
			{/if}
		</div>

		<div class="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3">
			<div>
				<p class="text-sm font-medium text-slate-900 dark:text-slate-100">Club status</p>
				<p class="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
					{isActive
						? 'Active clubs are available to players.'
						: 'Inactive clubs are hidden from players until reactivated.'}
				</p>
			</div>
			<button
				type="button"
				role="switch"
				aria-checked={isActive}
				aria-label="Toggle club active status"
				class="relative h-7 w-12 shrink-0 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 {isActive
					? 'bg-brand-600'
					: 'bg-slate-300'}"
				onclick={() => (isActive = !isActive)}
			>
				<span
					class="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white dark:bg-slate-900 shadow transition {isActive
						? 'translate-x-5'
						: ''}"
					aria-hidden="true"
				></span>
			</button>
			<input type="hidden" name="is_active" value={isActive ? 'true' : 'false'} />
		</div>

		<SubmitButton loading={loading} loadingLabel="Creating…">Create club</SubmitButton>
	</form>
	</AppCard>
</section>
