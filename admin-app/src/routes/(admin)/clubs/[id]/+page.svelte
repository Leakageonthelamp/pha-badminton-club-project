<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { SubmitFunction } from '@sveltejs/kit';
	import FormToast from '@repo/ui/components/FormToast.svelte';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import NotSetBadge from '@repo/ui/components/NotSetBadge.svelte';
	import SelectMenu from '@repo/ui/components/SelectMenu.svelte';
	import MapPinPicker from '$lib/components/MapPinPicker.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import {
		CLUB_DELETE_CONFIRM_PHRASE,
		CLUB_DESCRIPTION_MAX_LENGTH,
		CLUB_NAME_MAX_LENGTH
	} from '$lib/config/club';
	import { whileSubmitting } from '$lib/forms/submitting';
	import { formatThb, shuttlePricePerEach, type ClubShuttle, type PromptPayType } from '$lib/types/club';
	import { SHUTTLE_NAME_MAX_LENGTH } from '$lib/validation/clubSettings';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let updateLoading = $state(false);
	let promptPayLoading = $state(false);
	let locationLoading = $state(false);
	let shuttleCreateLoading = $state(false);
	let shuttleUpdateLoadingId = $state<string | null>(null);
	let shuttleDeleteLoadingId = $state<string | null>(null);
	let deleteLoading = $state(false);
	let assignLoadingUserId = $state<string | null>(null);
	let removeLoadingUserId = $state<string | null>(null);
	let searchInput = $state('');
	let searchLoading = $state(false);
	let initializedSearch = $state(false);
	let name = $state('');
	let description = $state('');
	let maxActiveSessions = $state('');
	let maxAdmins = $state('');
	let isActive = $state(true);
	let promptPayType = $state<PromptPayType | ''>('');
	let promptPayTarget = $state('');
	let latitude = $state<number | null>(null);
	let longitude = $state<number | null>(null);
	let lastSyncedAt = $state<string | null>(null);
	let deleteModalOpen = $state(false);
	let deleteConfirmText = $state('');
	let editingShuttleId = $state<string | null>(null);
	let locationEditing = $state(false);

	let newShuttleName = $state('');
	let newShuttleSpeed = $state('75');
	let newShuttleOriginalPrice = $state('');
	let newShuttlePrice = $state('');
	let newShuttlePerBox = $state('12');

	let editShuttleName = $state('');
	let editShuttleSpeed = $state('75');
	let editShuttleOriginalPrice = $state('');
	let editShuttlePrice = $state('');
	let editShuttlePerBox = $state('12');

	const isSuperAdmin = $derived(data.isSuperAdmin);

	const clubDescriptionNotSet = $derived(!data.club.description.trim());
	const shuttlesNotSet = $derived(data.shuttles.length === 0);
	const promptPayNotSet = $derived(
		!data.club.promptpay_type || !data.club.promptpay_target?.trim()
	);
	const locationNotSet = $derived(
		data.club.latitude === null || data.club.longitude === null
	);
	const clubAdminsNotSet = $derived(isSuperAdmin && data.admins.length === 0);

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
		promptPayType = club.promptpay_type ?? '';
		promptPayTarget = club.promptpay_target ?? '';
		if (!locationEditing) {
			latitude = club.latitude;
			longitude = club.longitude;
		}
		if (club.latitude === null || club.longitude === null) {
			locationEditing = true;
		} else if (!locationEditing) {
			locationEditing = false;
		}
		lastSyncedAt = club.updated_at;
	};

	const startEditShuttle = (shuttle: ClubShuttle) => {
		editingShuttleId = shuttle.id;
		editShuttleName = shuttle.name;
		editShuttleSpeed = String(shuttle.speed);
		editShuttleOriginalPrice = String(shuttle.original_price);
		editShuttlePrice = String(shuttle.price);
		editShuttlePerBox = String(shuttle.number_per_box);
	};

	const cancelEditShuttle = () => {
		editingShuttleId = null;
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
		if (!isSuperAdmin) return false;
		if (Number(maxActiveSessions) !== data.club.max_active_sessions) return true;
		if (Number(maxAdmins) !== data.club.max_admins) return true;
		if (isActive !== (data.club.is_active ?? true)) return true;
		return false;
	});

	const hasPromptPayChanges = $derived.by(() => {
		const savedType = data.club.promptpay_type ?? '';
		const savedTarget = data.club.promptpay_target ?? '';
		return promptPayType !== savedType || promptPayTarget.trim() !== savedTarget;
	});

	const hasLocationChanges = $derived.by(() => {
		return latitude !== data.club.latitude || longitude !== data.club.longitude;
	});

	const hasSavedLocation = $derived(
		data.club.latitude !== null && data.club.longitude !== null
	);
	const locationLocked = $derived(hasSavedLocation && !locationEditing);

	const handleLocationUpdate: SubmitFunction = ({ formData, cancel }) => {
		const isClear = formData.get('clear') === 'true';

		if (!isClear && (!hasLocationChanges || latitude === null || longitude === null)) {
			cancel();
			return;
		}

		locationLoading = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			locationLoading = false;

			if (result.type === 'success') {
				if (isClear) {
					locationEditing = true;
				} else {
					locationEditing = false;
				}
			}
		};
	};

	function startLocationEdit() {
		locationEditing = true;
	}

	function cancelLocationEdit() {
		latitude = data.club.latitude;
		longitude = data.club.longitude;
		locationEditing = false;
	}

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
	const cardClass = 'app-card-padded space-y-4';
	const shuttleSpeedOptions = [
		{ value: '75', label: '75' },
		{ value: '76', label: '76' }
	];

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
		<h1 class="text-2xl font-semibold text-slate-900">
			{isSuperAdmin ? data.club.name : 'Club settings'}
		</h1>
		<p class="mt-2 text-sm text-slate-600">
			{#if isSuperAdmin}
				Manage club settings and admins.
			{:else}
				{data.club.name} — configure shuttles, PromptPay, and location.
			{/if}
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
		<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
			<h2 class="text-lg font-semibold text-slate-900">Club settings</h2>
			{#if clubDescriptionNotSet}
				<NotSetBadge />
			{/if}
		</div>

		<div>
			<label for="name" class={labelClass}>Club name</label>
			<div class="relative">
				{#if updateLoading}
					<div class="app-skeleton absolute inset-0 z-10 h-[50px]" aria-hidden="true"></div>
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
					<div class="app-skeleton absolute inset-0 z-10 min-h-[122px]" aria-hidden="true"></div>
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

		{#if isSuperAdmin}
		<div>
			<label for="max_active_sessions" class={labelClass}>Max active sessions</label>
			<div class="relative">
				{#if updateLoading}
					<div class="app-skeleton absolute inset-0 z-10 h-[50px]" aria-hidden="true"></div>
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
					<div class="app-skeleton absolute inset-0 z-10 h-[50px]" aria-hidden="true"></div>
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
				<div class="app-skeleton absolute inset-0 z-10" aria-hidden="true"></div>
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
		{/if}

		<SubmitButton loading={updateLoading} loadingLabel="Saving…" disabled={!hasChanges || updateLoading}>
			Save changes
		</SubmitButton>
	</form>

	{#if !isSuperAdmin}
		<section class="{cardClass} space-y-4">
			<div>
				<h2 class="text-lg font-semibold text-slate-900">Club admins</h2>
				<p class="mt-2 text-sm text-slate-600">People who manage this club.</p>
			</div>

			{#if data.admins.length === 0}
				<p class="text-sm text-slate-500">No club admins assigned yet.</p>
			{:else}
				<ul class="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
					{#each data.admins as admin (admin.user_id)}
						<li class="flex items-center gap-3 bg-white px-4 py-3">
							<UserAvatar
								displayName={admin.profile?.display_name ?? 'Unknown'}
								avatarUrl={admin.profile?.avatar_url}
								size="sm"
							/>
							<div class="min-w-0 flex-1">
								<p class="truncate font-medium text-slate-900">
									{admin.profile?.display_name ?? 'Unknown'}
								</p>
								{#if admin.profile?.email}
									<p class="truncate text-sm text-slate-500">{admin.profile.email}</p>
								{:else if admin.profile?.phone}
									<p class="truncate text-sm text-slate-500">{admin.profile.phone}</p>
								{/if}
							</div>
							{#if admin.profile?.tag}
								<TagPill tag={admin.profile.tag} />
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}

	<section class="{cardClass} space-y-4">
		<div>
			<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
				<h2 class="text-lg font-semibold text-slate-900">Shuttlecocks</h2>
				{#if shuttlesNotSet}
					<NotSetBadge />
				{/if}
			</div>
			<p class="mt-2 text-sm text-slate-600">Brands and pricing your club uses.</p>
		</div>

		{#if data.shuttles.length === 0}
			<p class="text-sm text-slate-500">No shuttlecocks yet — add the brands your club uses.</p>
		{:else}
			<ul class="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
				{#each data.shuttles as shuttle (shuttle.id)}
					<li class="bg-white px-4 py-3">
						{#if editingShuttleId === shuttle.id}
							<form
								method="POST"
								action="?/updateShuttle"
								class="space-y-3"
								use:enhance={whileSubmitting((v) => {
									shuttleUpdateLoadingId = v ? shuttle.id : null;
								})}
							>
								<input type="hidden" name="shuttleId" value={shuttle.id} />
								<div class="grid gap-3 sm:grid-cols-2">
									<div class="sm:col-span-2">
										<label class={labelClass} for="edit-name-{shuttle.id}">Name</label>
										<input
											id="edit-name-{shuttle.id}"
											name="name"
											type="text"
											required
											maxlength={SHUTTLE_NAME_MAX_LENGTH}
											bind:value={editShuttleName}
											class={inputClass}
										/>
									</div>
									<div>
										<SelectMenu
											id="edit-speed-{shuttle.id}"
											label="Speed"
											options={shuttleSpeedOptions}
											bind:value={editShuttleSpeed}
										/>
										<input type="hidden" name="speed" value={editShuttleSpeed} />
									</div>
									<div>
										<label class={labelClass} for="edit-per-box-{shuttle.id}">Per box</label>
										<input
											id="edit-per-box-{shuttle.id}"
											name="number_per_box"
											type="number"
											min="1"
											required
											bind:value={editShuttlePerBox}
											class={inputClass}
										/>
									</div>
									<div>
										<label class={labelClass} for="edit-original-{shuttle.id}">Original price</label>
										<input
											id="edit-original-{shuttle.id}"
											name="original_price"
											type="number"
											min="0"
											step="0.01"
											required
											bind:value={editShuttleOriginalPrice}
											class={inputClass}
										/>
									</div>
									<div>
										<label class={labelClass} for="edit-price-{shuttle.id}">Price (per box)</label>
										<input
											id="edit-price-{shuttle.id}"
											name="price"
											type="number"
											min="0"
											step="0.01"
											required
											bind:value={editShuttlePrice}
											class={inputClass}
										/>
									</div>
								</div>
								<div class="flex flex-wrap gap-2">
									<SubmitButton
										loading={shuttleUpdateLoadingId === shuttle.id}
										loadingLabel="Saving…"
										class="!w-auto"
									>
										Save
									</SubmitButton>
									<SubmitButton type="button" variant="secondary" class="!w-auto" onclick={cancelEditShuttle}>
										Cancel
									</SubmitButton>
								</div>
							</form>
						{:else}
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<p class="font-medium text-slate-900">
										{shuttle.name}
										<span class="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
											{shuttle.speed}
										</span>
									</p>
									<p class="mt-1 text-sm text-slate-600">
										{formatThb(shuttle.original_price)} original · {formatThb(shuttle.price)} per box ·
										{shuttle.number_per_box} per box ·
										{formatThb(shuttlePricePerEach(shuttle))} each
									</p>
								</div>
								<div class="flex gap-2">
									<SubmitButton
										type="button"
										variant="secondary"
										class="!w-auto !py-2 !text-sm"
										onclick={() => startEditShuttle(shuttle)}
									>
										Edit
									</SubmitButton>
									<form
										method="POST"
										action="?/deleteShuttle"
										use:enhance={whileSubmitting((v) => {
											shuttleDeleteLoadingId = v ? shuttle.id : null;
										})}
									>
										<input type="hidden" name="shuttleId" value={shuttle.id} />
										<SubmitButton
											variant="ghost"
											loading={shuttleDeleteLoadingId === shuttle.id}
											loadingLabel="Removing…"
											class="!w-auto !py-2 !text-sm text-red-600 hover:!bg-red-50"
										>
											Delete
										</SubmitButton>
									</form>
								</div>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}

		<form
			method="POST"
			action="?/createShuttle"
			class="space-y-3 border-t border-slate-100 pt-4"
			use:enhance={whileSubmitting((v) => (shuttleCreateLoading = v))}
		>
			<h3 class="text-sm font-medium text-slate-700">Add shuttlecock</h3>
			<div class="grid gap-3 sm:grid-cols-2">
				<div class="sm:col-span-2">
					<label class={labelClass} for="new-shuttle-name">Name</label>
					<input
						id="new-shuttle-name"
						name="name"
						type="text"
						required
						maxlength={SHUTTLE_NAME_MAX_LENGTH}
						bind:value={newShuttleName}
						class={inputClass}
						placeholder="Yonex AS-30"
					/>
				</div>
				<div>
					<SelectMenu
						id="new-shuttle-speed"
						label="Speed"
						options={shuttleSpeedOptions}
						bind:value={newShuttleSpeed}
					/>
					<input type="hidden" name="speed" value={newShuttleSpeed} />
				</div>
				<div>
					<label class={labelClass} for="new-shuttle-per-box">Number per box</label>
					<input
						id="new-shuttle-per-box"
						name="number_per_box"
						type="number"
						min="1"
						required
						bind:value={newShuttlePerBox}
						class={inputClass}
					/>
				</div>
				<div>
					<label class={labelClass} for="new-shuttle-original">Original price</label>
					<input
						id="new-shuttle-original"
						name="original_price"
						type="number"
						min="0"
						step="0.01"
						required
						bind:value={newShuttleOriginalPrice}
						class={inputClass}
					/>
				</div>
				<div>
					<label class={labelClass} for="new-shuttle-price">Price (per box)</label>
					<input
						id="new-shuttle-price"
						name="price"
						type="number"
						min="0"
						step="0.01"
						required
						bind:value={newShuttlePrice}
						class={inputClass}
					/>
				</div>
			</div>
			<SubmitButton loading={shuttleCreateLoading} loadingLabel="Adding…" class="!w-auto">
				Add shuttlecock
			</SubmitButton>
		</form>
	</section>

	<form
		method="POST"
		action="?/updatePromptPay"
		class="{cardClass} space-y-4"
		use:enhance={whileSubmitting((v) => (promptPayLoading = v))}
	>
		<div>
			<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
				<h2 class="text-lg font-semibold text-slate-900">PromptPay</h2>
				{#if promptPayNotSet}
					<NotSetBadge />
				{/if}
			</div>
			<p class="mt-2 text-sm text-slate-600">
				Phone number or national ID for payment QR codes (coming soon).
			</p>
		</div>

		<fieldset class="space-y-3">
			<legend class="sr-only">PromptPay type</legend>
			<label class="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
				<input
					type="radio"
					name="promptpay_type"
					value="phone"
					bind:group={promptPayType}
					class="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-600"
				/>
				<span class="text-sm font-medium text-slate-900">Mobile phone</span>
			</label>
			<label class="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
				<input
					type="radio"
					name="promptpay_type"
					value="national_id"
					bind:group={promptPayType}
					class="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-600"
				/>
				<span class="text-sm font-medium text-slate-900">National ID card</span>
			</label>
		</fieldset>

		<div>
			<label for="promptpay_target" class={labelClass}>
				{promptPayType === 'national_id' ? 'National ID' : 'Phone number'}
			</label>
			<input
				id="promptpay_target"
				name="promptpay_target"
				type="text"
				inputmode={promptPayType === 'national_id' ? 'numeric' : 'tel'}
				bind:value={promptPayTarget}
				placeholder={promptPayType === 'national_id' ? '1234567890123' : '0812345678'}
				class={inputClass}
			/>
		</div>

		<div class="flex flex-wrap gap-2">
			<SubmitButton
				loading={promptPayLoading}
				loadingLabel="Saving…"
				disabled={!hasPromptPayChanges || !promptPayType}
				class="!w-auto"
			>
				Save PromptPay
			</SubmitButton>
			{#if data.club.promptpay_type || data.club.promptpay_target}
				<SubmitButton
					type="submit"
					name="clear"
					value="true"
					variant="ghost"
					loading={promptPayLoading}
					loadingLabel="Clearing…"
					class="!w-auto !text-sm"
				>
					Clear PromptPay
				</SubmitButton>
			{/if}
		</div>
	</form>

	<form
		method="POST"
		action="?/updateLocation"
		class="{cardClass} space-y-4"
		use:enhance={handleLocationUpdate}
	>
		<div>
			<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
				<h2 class="text-lg font-semibold text-slate-900">Location</h2>
				{#if locationNotSet}
					<NotSetBadge />
				{/if}
			</div>
			<p class="mt-2 text-sm text-slate-600">
				{#if locationLocked}
					Your club venue is saved. Change location only when you need to move the pin.
				{:else}
					Drag the map so the pin sits on your club venue. Location is required for players to find you.
				{/if}
			</p>
		</div>

		<MapPinPicker bind:latitude bind:longitude locked={locationLocked} disabled={locationLoading} />

		<input type="hidden" name="latitude" value={latitude ?? ''} />
		<input type="hidden" name="longitude" value={longitude ?? ''} />

		<div class="flex flex-wrap gap-2">
			{#if locationLocked}
				<SubmitButton
					type="button"
					variant="secondary"
					class="!w-auto"
					disabled={locationLoading}
					onclick={startLocationEdit}
				>
					Change location
				</SubmitButton>
				<SubmitButton
					type="submit"
					name="clear"
					value="true"
					variant="ghost"
					loading={locationLoading}
					loadingLabel="Clearing…"
					class="!w-auto !text-sm"
					onclick={() => {
						latitude = null;
						longitude = null;
					}}
				>
					Clear location
				</SubmitButton>
			{:else}
				<SubmitButton
					loading={locationLoading}
					loadingLabel="Saving…"
					disabled={!hasLocationChanges || latitude === null || longitude === null}
					class="!w-auto"
				>
					Save location
				</SubmitButton>
				{#if hasSavedLocation}
					<SubmitButton
						type="button"
						variant="ghost"
						class="!w-auto !text-sm"
						disabled={locationLoading}
						onclick={cancelLocationEdit}
					>
						Cancel
					</SubmitButton>
				{/if}
			{/if}
		</div>
	</form>

	{#if isSuperAdmin}
	<section class="{cardClass} space-y-4">
		<div>
			<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
				<h2 class="text-lg font-semibold text-slate-900">Club admins</h2>
				{#if clubAdminsNotSet}
					<NotSetBadge />
				{/if}
			</div>
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
	{/if}
</section>

{#if isSuperAdmin && deleteModalOpen}
	<AppModal open={deleteModalOpen} labelledBy="delete-club-title" onClose={closeDeleteModal}>
		<div class="overflow-hidden rounded-2xl bg-white shadow-xl">
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
	</AppModal>
{/if}
