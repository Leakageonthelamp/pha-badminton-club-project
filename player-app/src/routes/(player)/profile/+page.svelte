<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import AppLogo from '$lib/components/AppLogo.svelte';
	import AvatarCropModal from '$lib/components/AvatarCropModal.svelte';
	import SubmitButton from '$lib/components/SubmitButton.svelte';
	import { AVATAR_OUTPUT_SIZE, normalizeImageForCrop } from '$lib/images/cropAvatar';
	import { validateAvatarFile, validateAvatarInput } from '$lib/validation/avatar';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let saveLoading = $state(false);
	let avatarError = $state<string | null>(null);
	let processedAvatar = $state<File | null>(null);
	let avatarPreviewUrl = $state<string | null>(null);
	let cropOpen = $state(false);
	let cropImageSrc = $state<string | null>(null);
	let cropSourceSrc = $state<string | null>(null);
	let pickLoading = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);

	const handleSubmit: SubmitFunction = ({ formData, cancel }) => {
		if (processedAvatar) {
			formData.set('avatar', processedAvatar);
		}

		const avatar = formData.get('avatar');
		if (avatar instanceof File && avatar.size > 0) {
			const error = validateAvatarFile(avatar);
			if (error) {
				avatarError = error;
				cancel();
				return;
			}
		}

		saveLoading = true;
		return async ({ update }) => {
			await update();
			saveLoading = false;
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
		} finally {
			pickLoading = false;
		}
	}

	function onCropConfirm(file: File) {
		const error = validateAvatarFile(file);
		if (error) {
			avatarError = error;
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
</script>

<section class="space-y-6">
	<div class="flex flex-col items-center text-center">
		<AppLogo size={56} class="mb-3" />
		<h1 class="text-2xl font-semibold text-slate-900">Profile</h1>
		<p class="mt-2 text-sm text-slate-600">Update your display name and avatar.</p>
	</div>

	{#if data.loadError}
		<div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
			{data.loadError}
		</div>
	{:else if data.profile}
		<div class="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
			{#if avatarPreviewUrl}
				<img src={avatarPreviewUrl} alt="" class="h-16 w-16 rounded-full object-cover" />
			{:else if data.profile.avatar_url}
				<img src={data.profile.avatar_url} alt="" class="h-16 w-16 rounded-full object-cover" />
			{:else}
				<div
					class="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-800"
				>
					{data.profile.display_name.slice(0, 1).toUpperCase()}
				</div>
			{/if}
			<div>
				<p class="font-semibold text-slate-900">{data.profile.display_name}</p>
				<p class="text-sm text-slate-500">Player account</p>
			</div>
		</div>

		{#if form?.success}
			<div class="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
				Profile updated.
			</div>
		{/if}

		{#if form?.error || avatarError}
			<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
				{avatarError ?? form?.error}
			</div>
		{/if}

		<form
			method="POST"
			action="?/updateProfile"
			enctype="multipart/form-data"
			class="space-y-4"
			use:enhance={handleSubmit}
		>
			<div>
				<label for="displayName" class="mb-2 block text-sm font-medium text-slate-700">
					Display name
				</label>
				<input
					id="displayName"
					name="displayName"
					type="text"
					required
					value={data.profile.display_name}
					class="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
				/>
			</div>

			<div>
				<span class="mb-2 block text-sm font-medium text-slate-700">Avatar</span>
				<input
					bind:this={fileInput}
					type="file"
					accept="image/*"
					class="sr-only"
					onchange={onAvatarPick}
				/>

				<div class="flex flex-wrap items-center gap-3">
					<SubmitButton
						type="button"
						variant="secondary"
						class="w-auto! rounded-xl px-4 py-2.5"
						loading={pickLoading}
						loadingLabel="Opening…"
						onclick={openFilePicker}
					>
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

				<p class="mt-2 text-xs text-slate-500">
					Large phone photos are cropped and resized to {AVATAR_OUTPUT_SIZE}×{AVATAR_OUTPUT_SIZE} px
					before upload.
				</p>
			</div>

			<SubmitButton loading={saveLoading} loadingLabel="Saving…" disabled={!!avatarError}>
				Save changes
			</SubmitButton>
		</form>

		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
			<h2 class="mb-3 font-medium text-slate-900">Account details</h2>
			<dl class="space-y-3">
				<div>
					<dt class="text-slate-500">Email</dt>
					<dd class="font-medium text-slate-800">{data.profile.email ?? 'Not set'}</dd>
				</div>
				<div>
					<dt class="text-slate-500">Phone</dt>
					<dd class="font-medium text-slate-800">{data.profile.phone ?? 'Not set'}</dd>
				</div>
				<div>
					<dt class="text-slate-500">Password</dt>
					<dd class="font-medium text-slate-800">Hidden</dd>
				</div>
			</dl>
			<p class="mt-4 text-xs text-slate-500">
				To change email, phone, or password, contact a club admin. Self-service changes are not
				available in this version.
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
