<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import AvatarCropModal from '$lib/components/AvatarCropModal.svelte';
	import UploadIcon from '@repo/ui/icons/UploadIcon.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import FormToast from '@repo/ui/components/FormToast.svelte';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import { toast } from '@repo/ui/toast/toast.svelte';
	import { AVATAR_OUTPUT_SIZE, normalizeImageForCrop } from '$lib/images/cropAvatar';
	import { validateAvatarFile, validateAvatarInput } from '$lib/validation/avatar';
	import { tagSuffixFromFull, toFullTag } from '$lib/validation/tag';
	import { getProfileCredential } from '$lib/types/auth';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const formValues = $derived(
		form && 'values' in form
			? (form.values as { displayName?: string; tag?: string } | undefined)
			: null
	);
	const fieldErrors = $derived(
		form && 'fieldErrors' in form
			? (form.fieldErrors as { displayName?: string | null; tag?: string | null } | undefined)
			: null
	);

	let saveLoading = $state(false);
	let avatarError = $state<string | null>(null);
	let displayName = $state('');
	let tagSuffix = $state('');
	let processedAvatar = $state<File | null>(null);
	let avatarPreviewUrl = $state<string | null>(null);
	let cropOpen = $state(false);
	let cropImageSrc = $state<string | null>(null);
	let cropSourceSrc = $state<string | null>(null);
	let pickLoading = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);
	let lastSyncedAt = $state<string | null>(null);

	const displayedTag = $derived(toFullTag(tagSuffix));

	const credential = $derived(data.profile ? getProfileCredential(data.profile) : null);

	const hasChanges = $derived.by(() => {
		if (!data.profile) return false;
		if (processedAvatar) return true;
		if (displayName.trim() !== data.profile.display_name) return true;
		return toFullTag(tagSuffix) !== data.profile.tag;
	});

	$effect(() => {
		if (!data.profile) return;

		if (formValues) {
			displayName = formValues.displayName ?? data.profile.display_name;
			tagSuffix = tagSuffixFromFull(formValues.tag ?? data.profile.tag);
			return;
		}

		const token = data.profile.updated_at;
		if (lastSyncedAt !== token) {
			displayName = data.profile.display_name;
			tagSuffix = tagSuffixFromFull(data.profile.tag);
			lastSyncedAt = token;
		}
	});

	const handleSubmit: SubmitFunction = ({ formData, cancel }) => {
		if (!hasChanges) {
			cancel();
			return;
		}

		formData.set('tag', toFullTag(tagSuffix));

		if (processedAvatar) {
			formData.set('avatar', processedAvatar);
		}

		const avatar = formData.get('avatar');
		if (avatar instanceof File && avatar.size > 0) {
			const error = validateAvatarFile(avatar);
			if (error) {
				avatarError = error;
				toast.error(error);
				cancel();
				return;
			}
		}

		saveLoading = true;
		return async ({ update, result }) => {
			await update({ reset: false });
			saveLoading = false;

			if (result.type === 'success') {
				processedAvatar = null;
				cropSourceSrc = null;
				if (fileInput) fileInput.value = '';
			}
		};
	};

	function revokePreviewUrl() {
		if (avatarPreviewUrl) {
			URL.revokeObjectURL(avatarPreviewUrl);
			avatarPreviewUrl = null;
		}
	}

	function revokeCropSrc() {
		cropImageSrc = null;
	}

	function setProcessedAvatar(file: File) {
		revokePreviewUrl();
		processedAvatar = file;
		avatarPreviewUrl = URL.createObjectURL(file);
		avatarError = null;
	}

	function clearAvatarSelection() {
		revokePreviewUrl();
		cropSourceSrc = null;
		processedAvatar = null;
		avatarError = null;
		if (fileInput) fileInput.value = '';
	}

	function openFilePicker() {
		fileInput?.click();
	}

	async function onAvatarPick(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';

		const error = validateAvatarInput(file ?? null);
		if (error) {
			avatarError = error;
			toast.error(error);
			return;
		}

		if (!file) return;

		pickLoading = true;
		avatarError = null;

		try {
			revokeCropSrc();
			cropSourceSrc = await normalizeImageForCrop(file);
			cropImageSrc = cropSourceSrc;
			cropOpen = true;
		} catch {
			avatarError = 'Could not open that image. Try another photo.';
			toast.error(avatarError);
		} finally {
			pickLoading = false;
		}
	}

	function onCropConfirm(file: File) {
		const error = validateAvatarFile(file);
		if (error) {
			avatarError = error;
			toast.error(error);
			return;
		}

		setProcessedAvatar(file);
		cropOpen = false;
		cropImageSrc = null;
	}

	function onCropCancel() {
		cropOpen = false;
		cropImageSrc = null;
	}

	function reopenCrop() {
		if (!cropSourceSrc) return;
		cropImageSrc = cropSourceSrc;
		cropOpen = true;
	}

	$effect(() => {
		return () => {
			revokePreviewUrl();
		};
	});
	function onTagSuffixInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		tagSuffix = input.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4);
	}

	const inputClass =
		'w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20';
	const profileFieldClass = $derived(`${inputClass}${saveLoading ? ' opacity-0' : ''}`);
	const labelClass = 'mb-2 block text-sm font-medium text-slate-700';
</script>

<FormToast message={data.loadError} variant="warning" token={data.loadError ?? ''} />
<FormToast message={form?.success ? 'Profile updated.' : null} variant="success" token={form?.at ?? ''} />
<FormToast message={form?.error ?? null} variant="error" token={form?.error ?? ''} />

<section class="space-y-6">
	<DashboardHero title="Profile" subtitle="Update your display name, tag, and avatar." />

	{#if data.profile}
		<AppCard class="flex items-center gap-4">
			{#if avatarPreviewUrl}
				<img
					src={avatarPreviewUrl}
					alt=""
					class="h-16 w-16 rounded-full object-cover"
					referrerpolicy="no-referrer"
				/>
			{:else}
				<UserAvatar
					displayName={data.profile.display_name}
					avatarUrl={data.profile.avatar_url}
					size="xl"
				/>
			{/if}
			<div>
				<p class="font-semibold text-slate-900">{data.profile.display_name}</p>
				<TagPill tag={displayedTag} size="md" class="mt-1" />
			</div>
		</AppCard>

		<AppCard class="space-y-4">
		<form
			method="POST"
			action="?/updateProfile"
			enctype="multipart/form-data"
			class="space-y-4"
			use:enhance={handleSubmit}
			aria-busy={saveLoading}
		>
			<div>
				<label for="displayName" class={labelClass}>
					Display name
				</label>
				<div class="relative">
					{#if saveLoading}
						<div class="app-skeleton absolute inset-0 z-10 h-[50px]" aria-hidden="true"></div>
					{/if}
					<input
						id="displayName"
						name="displayName"
						type="text"
						required
						bind:value={displayName}
						disabled={saveLoading}
						class={profileFieldClass}
					/>
				</div>
				{#if fieldErrors?.displayName}
					<p class="mt-2 text-sm text-red-600">{fieldErrors.displayName}</p>
				{/if}
			</div>

			<div>
				<label for="tagSuffix" class={labelClass}>Tag</label>
				<div class="relative">
					{#if saveLoading}
						<div class="app-skeleton absolute inset-0 z-10 h-[50px]" aria-hidden="true"></div>
					{/if}
					<div
						class="flex overflow-hidden rounded-xl border border-slate-300 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/20{saveLoading
							? ' opacity-0'
							: ''}"
					>
						<span
							class="flex items-center bg-slate-50 px-4 font-mono text-base font-semibold text-brand-700"
							aria-hidden="true"
						>
							#
						</span>
						<input
							id="tagSuffix"
							type="text"
							required
							maxlength="4"
							autocapitalize="none"
							autocomplete="off"
							spellcheck="false"
							inputmode="text"
							placeholder="1234"
							value={tagSuffix}
							disabled={saveLoading}
							oninput={onTagSuffixInput}
							class="min-w-0 flex-1 bg-white py-3 pr-4 font-mono text-base focus:outline-none"
						/>
					</div>
				</div>
				<p class="mt-2 text-xs text-slate-500">
					Unique player ID when display names match. Enter 4 letters or numbers.
				</p>
				{#if fieldErrors?.tag}
					<p class="mt-2 text-sm text-red-600">{fieldErrors.tag}</p>
				{/if}
			</div>

			<div>
				<span class={labelClass}>Avatar</span>
				<input
					bind:this={fileInput}
					type="file"
					accept="image/*"
					class="sr-only"
					disabled={saveLoading}
					onchange={onAvatarPick}
				/>

				<div class="relative">
					{#if saveLoading}
						<div class="app-skeleton absolute inset-0 z-10 h-[42px]" aria-hidden="true"></div>
					{/if}
					<div class="flex flex-wrap items-center gap-3{saveLoading ? ' opacity-0' : ''}">
						<SubmitButton
							type="button"
							variant="secondary"
							class="w-auto! rounded-xl px-4 py-2.5"
							loading={pickLoading}
							loadingLabel="Opening…"
							disabled={saveLoading}
							onclick={openFilePicker}
						>
						<UploadIcon class="h-5 w-5 shrink-0 text-brand-700" />
						{processedAvatar ? 'Choose another photo' : 'Choose photo'}
					</SubmitButton>

					{#if processedAvatar}
						<button
							type="button"
							class="text-sm font-medium text-brand-700 hover:text-brand-800"
							onclick={reopenCrop}
						>
							Edit crop
						</button>
						<button
							type="button"
							class="text-sm font-medium text-slate-500 hover:text-slate-700"
							onclick={clearAvatarSelection}
						>
							Remove
						</button>
					{/if}
					</div>
				</div>

				<p class="mt-2 text-xs text-slate-500">
					Large phone photos are cropped and resized to {AVATAR_OUTPUT_SIZE}×{AVATAR_OUTPUT_SIZE} px
					before upload.
				</p>
			</div>

			<SubmitButton
				loading={saveLoading}
				loadingLabel="Saving…"
				disabled={!hasChanges || !!avatarError}
			>
				Save changes
			</SubmitButton>
		</form>
		</AppCard>

		<div class="app-muted-panel">
			<h2 class="mb-3 font-medium text-slate-900">Account details</h2>
			<dl class="space-y-3">
				{#if credential}
					<div>
						<dt class="text-slate-500">Sign-in method</dt>
						<dd class="font-medium capitalize text-slate-800">{credential.type}</dd>
					</div>
					<div>
						<dt class="text-slate-500">
							{credential.type === 'phone' ? 'Phone number' : 'Email address'}
						</dt>
						<dd class="font-medium text-slate-800">{credential.value}</dd>
					</div>
					<div>
						<dt class="text-slate-500">Password</dt>
						<dd class="font-medium text-slate-800">Hidden</dd>
					</div>
				{:else}
					<div>
						<dt class="text-slate-500">Sign-in</dt>
						<dd class="font-medium text-slate-800">Not set</dd>
					</div>
				{/if}
			</dl>
			<p class="mt-4 text-xs text-slate-500">
				{#if credential?.type === 'phone'}
					To change your phone number or password, contact a club admin. Self-service changes are
					not available in this version.
				{:else if credential?.type === 'email'}
					To change your email or password, contact a club admin. Self-service changes are not
					available in this version.
				{:else}
					To change your sign-in details, contact a club admin. Self-service changes are not
					available in this version.
				{/if}
			</p>
		</div>
	{/if}
</section>

<AvatarCropModal
	open={cropOpen}
	imageSrc={cropImageSrc}
	onConfirm={onCropConfirm}
	onCancel={onCropCancel}
/>
