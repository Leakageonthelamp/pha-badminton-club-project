<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { SubmitFunction } from '@sveltejs/kit';
	import FormToast from '$lib/components/FormToast.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import {
		CLUB_DELETE_CONFIRM_PHRASE,
		CLUB_DESCRIPTION_MAX_LENGTH,
		CLUB_NAME_MAX_LENGTH
	} from '$lib/config/club';
	import { whileSubmitting } from '$lib/forms/submitting';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let updateLoading = $state(false);
	let deleteLoading = $state(false);
	let assignLoadingUserId = $state<string | null>(null);
	let removeLoadingUserId = $state<string | null>(null);
	let searchInput = $state('');
	let searchLoading = $state(false);
	let initializedSearch = $state(false);
	let name = $state(data.club.name);
	let description = $state(data.club.description);
	let maxActiveSessions = $state(String(data.club.max_active_sessions));
	let maxAdmins = $state(String(data.club.max_admins));
	let isActive = $state(data.club.is_active);
	let lastSyncedAt = $state(data.club.updated_at);
	let deleteModalOpen = $state(false);
	let deleteConfirmText = $state('');

	const deleteConfirmed = $derived(deleteConfirmText === CLUB_DELETE_CONFIRM_PHRASE);

	const inputClass =
		'w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20';
	const settingsFieldClass = $derived(`${inputClass}${updateLoading ? ' opacity-0' : ''}`);

	const syncSettingsFromClub = (club: PageData['club']) => {
		name = club.name;
		description = club.description;
		maxActiveSessions = String(club.max_active_sessions);
		maxAdmins = String(club.max_admins);
		isActive = club.is_active ?? true;
		lastSyncedAt = club.updated_at;
	};

	$effect.pre(() => {
		if (updateLoading) return;

		const token = data.club.updated_at;
		if (lastSyncedAt !== token) {
			syncSettingsFromClub(data.club);
		}
	});

	const hasChanges = $derived.by(() => {
		if (name.trim() !== data.club.name) return true;
		if (description.trim() !== data.club.description) return true;
		if (Number(maxActiveSessions) !== data.club.max_active_sessions) return true;
		if (Number(maxAdmins) !== data.club.max_admins) return true;
		if (isActive !== (data.club.is_active ?? true)) return true;
		return false;
	});

	const handleUpdate: SubmitFunction = ({ cancel }) => {
		if (!hasChanges) {
			cancel();
			return;
		}

		updateLoading = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			updateLoading = false;

			if (result.type === 'success') {
				syncSettingsFromClub(data.club);
			}
		};
	};

	const handleDelete: SubmitFunction = (input) => {
		if (!deleteConfirmed) {
			input.cancel();
			return;
		}
		return whileSubmitting((v) => (deleteLoading = v))(input);
	};

	function openDeleteModal() {
		deleteConfirmText = '';
		deleteModalOpen = true;
	}

	function closeDeleteModal() {
		deleteModalOpen = false;
		deleteConfirmText = '';
	}

	$effect(() => {
		if (!initializedSearch) {
			searchInput = data.searchQuery;
			initializedSearch = true;
		}
	});

	const toastMessage = $derived(form?.message ?? (data.created ? 'Club created.' : null));
	const toastVariant = $derived(form?.success || data.created ? 'success' : 'error');

	const labelClass = 'mb-2 block text-sm font-medium text-slate-700';
	const cardClass = 'rounded-2xl border border-slate-200 bg-white p-4';
	const skeletonClass = 'animate-pulse rounded-xl bg-slate-200';

	async function submitSearch(event: SubmitEvent) {
		event.preventDefault();
		const q = searchInput.trim();
		searchLoading = true;
		try {
			await goto(q ? `?q=${encodeURIComponent(q)}` : '?', { keepFocus: true });
		} finally {
			searchLoading = false;
		}
	}

	function enhanceAssign(userId: string): SubmitFunction {
		return () => {
			assignLoadingUserId = userId;
			return async ({ result, update }) => {
				await update();
				assignLoadingUserId = null;
				if (result.type === 'success') {
					searchInput = '';
					await goto(page.url.pathname, { keepFocus: true, replaceState: true, noScroll: true });
				}
			};
		};
	}
</script>

<FormToast message={toastMessage} variant={toastVariant} token={toastMessage ?? ''} />

<section class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold text-slate-900">{data.club.name}</h1>
		<p class="mt-2 text-sm text-slate-600">
			Manage club settings and admins.
			{#if !data.club.is_active}
				<span class="font-medium text-amber-700">This club is inactive.</span>
			{/if}
		</p>
	</div>

	<form
		method="POST"
		action="?/update"
		class="{cardClass} space-y-4"
		use:enhance={handleUpdate}
		aria-busy={updateLoading}
	>
		<h2 class="text-lg font-semibold text-slate-900">Club settings</h2>

		<div>
			<label for="name" class={labelClass}>Club name</label>
			<div class="relative">
				{#if updateLoading}
					<div class="{skeletonClass} absolute inset-0 z-10 h-[50px]" aria-hidden="true"></div>
				{/if}
				<input
					id="name"
					name="name"
					type="text"
					required
					maxlength={CLUB_NAME_MAX_LENGTH}
					bind:value={name}
					disabled={updateLoading}
					class={settingsFieldClass}
				/>
			</div>
		</div>

		<div>
			<label for="description" class={labelClass}>Description</label>
			<div class="relative">
				{#if updateLoading}
					<div class="{skeletonClass} absolute inset-0 z-10 min-h-[122px]" aria-hidden="true"></div>
				{/if}
				<textarea
					id="description"
					name="description"
					rows="4"
					maxlength={CLUB_DESCRIPTION_MAX_LENGTH}
					bind:value={description}
					disabled={updateLoading}
					class="{settingsFieldClass} resize-y"></textarea>
			</div>
		</div>

		<div>
			<label for="max_active_sessions" class={labelClass}>Max active sessions</label>
			<div class="relative">
				{#if updateLoading}
					<div class="{skeletonClass} absolute inset-0 z-10 h-[50px]" aria-hidden="true"></div>
				{/if}
				<input
					id="max_active_sessions"
					name="max_active_sessions"
					type="number"
					min="1"
					max={data.maxActiveSessionsLimit}
					required
					bind:value={maxActiveSessions}
					disabled={updateLoading}
					inputmode="numeric"
					class={settingsFieldClass}
				/>
			</div>
			<p class="mt-2 text-xs text-slate-500">
				Whole number from 1 to {data.maxActiveSessionsLimit}.
			</p>
		</div>

		<div>
			<label for="max_admins" class={labelClass}>Max club admins</label>
			<div class="relative">
				{#if updateLoading}
					<div class="{skeletonClass} absolute inset-0 z-10 h-[50px]" aria-hidden="true"></div>
				{/if}
				<input
					id="max_admins"
					name="max_admins"
					type="number"
					min="1"
					max={data.maxAdminsLimit}
					required
					bind:value={maxAdmins}
					disabled={updateLoading}
					inputmode="numeric"
					class={settingsFieldClass}
				/>
			</div>
			<p class="mt-2 text-xs text-slate-500">
				Whole number from 1 to {data.maxAdminsLimit}. Cannot be set below currently assigned admins.
			</p>
		</div>

		<div
			class="relative flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3"
		>
			{#if updateLoading}
				<div class="{skeletonClass} absolute inset-0 z-10" aria-hidden="true"></div>
			{/if}
			<div class={updateLoading ? 'opacity-0' : ''}>
				<p class="text-sm font-medium text-slate-900">Club status</p>
				<p class="mt-1 text-xs text-slate-500">
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
				disabled={updateLoading}
				class="relative h-7 w-12 shrink-0 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-wait{updateLoading
					? ' opacity-0'
					: ''} {isActive ? 'bg-brand-600' : 'bg-slate-300'}"
				onclick={() => (isActive = !isActive)}
			>
				<span
					class="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition {isActive
						? 'translate-x-5'
						: ''}"
					aria-hidden="true"
				></span>
			</button>
			<input type="hidden" name="is_active" value={isActive ? 'true' : 'false'} />
		</div>

		<SubmitButton loading={updateLoading} loadingLabel="Saving…" disabled={!hasChanges || updateLoading}>
			Save changes
		</SubmitButton>
	</form>

	<section class="{cardClass} space-y-4">
		<div>
			<h2 class="text-lg font-semibold text-slate-900">Club admins</h2>
			<p class="mt-2 text-sm text-slate-600">
				Assign players as admins for this club. The same person can admin multiple clubs.
				<span class="font-medium text-slate-700">
					{data.admins.length} / {data.club.max_admins} assigned here
				</span>
			</p>
			{#if data.atAdminCapacity}
				<p class="mt-2 text-sm text-amber-700">
					Admin limit reached. Increase max admins or remove someone first.
				</p>
			{/if}
		</div>

		<form method="GET" class="flex flex-col gap-2 sm:flex-row" onsubmit={submitSearch}>
			<input
				type="search"
				name="q"
				bind:value={searchInput}
				placeholder="Search by name, tag, email, or phone"
				class="{inputClass} min-w-0 flex-1"
				autocomplete="off"
				disabled={searchLoading}
			/>
			<SubmitButton
				type="submit"
				variant="secondary"
				loading={searchLoading}
				loadingLabel="Searching…"
				class="!w-full sm:!w-auto"
			>
				Search
			</SubmitButton>
		</form>

		{#if data.searchQuery.length >= 2}
			{#if data.searchResults.length === 0}
				<p class="text-sm text-slate-500">No matching users found.</p>
			{:else}
				<ul class="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
					{#each data.searchResults as user (user.id)}
						<li
							class="flex flex-col gap-3 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
						>
							<div class="min-w-0">
								<p class="font-medium text-slate-900">
									{user.display_name}
									<span class="text-slate-400">{user.tag}</span>
								</p>
								{#if user.email}
									<p class="truncate text-sm text-slate-500">{user.email}</p>
								{:else if user.phone}
									<p class="truncate text-sm text-slate-500">{user.phone}</p>
								{/if}
								{#if user.otherClubCount > 0}
									<p class="mt-1 text-xs text-brand-700">
										Already admin of {user.otherClubCount} other club{user.otherClubCount === 1
											? ''
											: 's'}
									</p>
								{/if}
							</div>
							<form
								method="POST"
								action="?/assign"
								class="w-full sm:w-auto"
								use:enhance={enhanceAssign(user.id)}
							>
								<input type="hidden" name="userId" value={user.id} />
								<SubmitButton
									variant="secondary"
									loading={assignLoadingUserId === user.id}
									loadingLabel="Assigning…"
									disabled={data.atAdminCapacity}
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
						<li
							class="flex flex-col gap-3 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
						>
							<div class="min-w-0">
								<p class="font-medium text-slate-900">
									{admin.profile?.display_name ?? 'Unknown'}
									{#if admin.profile?.tag}
										<span class="text-slate-400">{admin.profile.tag}</span>
									{/if}
								</p>
								{#if admin.profile?.email}
									<p class="truncate text-sm text-slate-500">{admin.profile.email}</p>
								{:else if admin.profile?.phone}
									<p class="truncate text-sm text-slate-500">{admin.profile.phone}</p>
								{/if}
								{#if admin.otherClubCount > 0}
									<p class="mt-1 text-xs text-brand-700">
										Also admin of {admin.otherClubCount} other club{admin.otherClubCount === 1
											? ''
											: 's'}
									</p>
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

	<section class="rounded-2xl border border-red-300 bg-red-50 p-4">
		<h2 class="text-lg font-semibold text-red-900">Danger zone</h2>
		<p class="mt-2 text-sm text-red-800">
			Deleting a club removes all club admin assignments. This cannot be undone.
		</p>
		<button
			type="button"
			class="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 sm:w-auto"
			onclick={openDeleteModal}
		>
			Delete club
		</button>
	</section>
</section>

{#if deleteModalOpen}
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
		role="dialog"
		aria-modal="true"
		aria-labelledby="delete-club-title"
	>
		<button
			type="button"
			class="absolute inset-0 cursor-default"
			aria-label="Close delete confirmation"
			onclick={closeDeleteModal}
		></button>

		<div class="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
			<div class="border-b border-red-100 bg-red-50 px-4 py-4">
				<h2 id="delete-club-title" class="text-lg font-semibold text-red-900">Delete this club?</h2>
				<p class="mt-2 text-sm text-red-800">
					This permanently deletes <span class="font-semibold">{data.club.name}</span> and all club admin
					assignments.
				</p>
			</div>

			<form method="POST" action="?/delete" class="space-y-4 p-4" use:enhance={handleDelete}>
				<div>
					<label for="deleteConfirmText" class="mb-2 block text-sm font-medium text-slate-700">
						Type <span class="font-mono text-red-700">{CLUB_DELETE_CONFIRM_PHRASE}</span> to confirm
					</label>
					<input
						id="deleteConfirmText"
						name="confirmText"
						type="text"
						autocomplete="off"
						spellcheck="false"
						bind:value={deleteConfirmText}
						class={inputClass}
					/>
				</div>

				<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<SubmitButton
						type="button"
						variant="secondary"
						class="sm:!w-auto"
						disabled={deleteLoading}
						onclick={closeDeleteModal}
					>
						Cancel
					</SubmitButton>
					<SubmitButton
						loading={deleteLoading}
						loadingLabel="Deleting…"
						disabled={!deleteConfirmed}
						class="!w-full border-transparent bg-red-600 text-white hover:!bg-red-700 disabled:!bg-red-300 disabled:hover:!bg-red-300 sm:!w-auto"
					>
						Delete club permanently
					</SubmitButton>
				</div>
			</form>
		</div>
	</div>
{/if}
