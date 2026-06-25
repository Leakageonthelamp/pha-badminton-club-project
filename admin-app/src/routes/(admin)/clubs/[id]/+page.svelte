<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import FormToast from '$lib/components/FormToast.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import { whileSubmitting } from '$lib/forms/submitting';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let updateLoading = $state(false);
	let deleteLoading = $state(false);
	let assignLoadingUserId = $state<string | null>(null);
	let removeLoadingUserId = $state<string | null>(null);
	let searchInput = $state('');
	let initializedSearch = $state(false);

	$effect(() => {
		if (!initializedSearch) {
			searchInput = data.searchQuery;
			initializedSearch = true;
		}
	});

	const toastMessage = $derived(form?.message ?? (data.created ? 'Club created.' : null));
	const toastVariant = $derived(form?.success || data.created ? 'success' : 'error');

	const inputClass =
		'w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20';
	const labelClass = 'mb-2 block text-sm font-medium text-slate-700';
	const cardClass = 'rounded-2xl border border-slate-200 bg-white p-4';
</script>

<FormToast message={toastMessage} variant={toastVariant} token={toastMessage ?? ''} />

<section class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold text-slate-900">{data.club.name}</h1>
		<p class="mt-2 text-sm text-slate-600">Manage club settings and admins.</p>
	</div>

	<form
		method="POST"
		action="?/update"
		class="{cardClass} space-y-4"
		use:enhance={whileSubmitting((v) => (updateLoading = v))}
	>
		<h2 class="text-lg font-semibold text-slate-900">Club settings</h2>

		<div>
			<label for="name" class={labelClass}>Club name</label>
			<input
				id="name"
				name="name"
				type="text"
				required
				maxlength="100"
				value={data.club.name}
				class={inputClass}
			/>
		</div>

		<div>
			<label for="description" class={labelClass}>Description</label>
			<textarea id="description" name="description" rows="4" maxlength="1000" class="{inputClass} resize-y"
				>{data.club.description}</textarea
			>
		</div>

		<div>
			<label for="max_active_sessions" class={labelClass}>Max active sessions</label>
			<input
				id="max_active_sessions"
				name="max_active_sessions"
				type="number"
				min="1"
				max="100"
				required
				value={data.club.max_active_sessions}
				inputmode="numeric"
				class={inputClass}
			/>
		</div>

		<SubmitButton loading={updateLoading} loadingLabel="Saving…">Save changes</SubmitButton>
	</form>

	<section class="{cardClass} space-y-4">
		<div>
			<h2 class="text-lg font-semibold text-slate-900">Club admins</h2>
			<p class="mt-2 text-sm text-slate-600">Assign players as admins for this club.</p>
		</div>

		<form
			method="GET"
			class="flex flex-col gap-2 sm:flex-row"
			onsubmit={(event) => {
				event.preventDefault();
				const q = searchInput.trim();
				goto(q ? `?q=${encodeURIComponent(q)}` : '?', { keepFocus: true });
			}}
		>
			<input
				type="search"
				name="q"
				bind:value={searchInput}
				placeholder="Search by name, tag, or email"
				class="{inputClass} min-w-0 flex-1"
				autocomplete="off"
			/>
			<button type="submit" class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
				Search
			</button>
		</form>

		{#if data.searchQuery.length >= 2}
			{#if data.searchResults.length === 0}
				<p class="text-sm text-slate-500">No matching users found.</p>
			{:else}
				<ul class="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
					{#each data.searchResults as user (user.id)}
						<li class="flex flex-col gap-3 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
							<div class="min-w-0">
								<p class="font-medium text-slate-900">
									{user.display_name}
									<span class="text-slate-400">{user.tag}</span>
								</p>
								{#if user.email}
									<p class="truncate text-sm text-slate-500">{user.email}</p>
								{/if}
							</div>
							<form
								method="POST"
								action="?/assign"
								class="w-full sm:w-auto"
								use:enhance={whileSubmitting((v) => {
									assignLoadingUserId = v ? user.id : null;
								})}
							>
								<input type="hidden" name="userId" value={user.id} />
								<SubmitButton
									variant="secondary"
									loading={assignLoadingUserId === user.id}
									loadingLabel="Assigning…"
									class="!py-2.5 !text-sm sm:!w-auto"
								>
									Assign
								</SubmitButton>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		{:else if data.searchQuery.length > 0}
			<p class="text-sm text-slate-500">Type at least 2 characters to search.</p>
		{/if}

		<div class="space-y-2">
			<h3 class="text-sm font-medium text-slate-700">Assigned admins</h3>
			{#if data.admins.length === 0}
				<p class="text-sm text-slate-500">No club admins assigned yet.</p>
			{:else}
				<ul class="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
					{#each data.admins as admin (admin.user_id)}
						<li class="flex flex-col gap-3 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
							<div class="min-w-0">
								<p class="font-medium text-slate-900">
									{admin.profiles?.display_name ?? 'Unknown'}
									{#if admin.profiles?.tag}
										<span class="text-slate-400">{admin.profiles.tag}</span>
									{/if}
								</p>
								{#if admin.profiles?.email}
									<p class="truncate text-sm text-slate-500">{admin.profiles.email}</p>
								{/if}
							</div>
							<form
								method="POST"
								action="?/remove"
								class="w-full sm:w-auto"
								use:enhance={whileSubmitting((v) => {
									removeLoadingUserId = v ? admin.user_id : null;
								})}
							>
								<input type="hidden" name="userId" value={admin.user_id} />
								<SubmitButton
									variant="ghost"
									loading={removeLoadingUserId === admin.user_id}
									loadingLabel="Removing…"
									class="!w-full !py-2.5 !text-sm text-red-600 hover:!bg-red-50 sm:!w-auto"
								>
									Remove
								</SubmitButton>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>

	<section class="rounded-2xl border border-red-200 bg-red-50/40 p-4">
		<h2 class="text-lg font-semibold text-red-800">Danger zone</h2>
		<p class="mt-2 text-sm text-red-700/80">
			Deleting a club removes all club admin assignments. This cannot be undone.
		</p>
		<form
			method="POST"
			action="?/delete"
			class="mt-4"
			use:enhance={whileSubmitting((v) => (deleteLoading = v))}
		>
			<SubmitButton
				variant="secondary"
				loading={deleteLoading}
				loadingLabel="Deleting…"
				class="border-red-300 text-red-700 hover:bg-red-100"
			>
				Delete club
			</SubmitButton>
		</form>
	</section>
</section>
