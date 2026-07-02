<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';
	import AvatarCropModal from '$lib/components/AvatarCropModal.svelte';
	import UploadIcon from '@repo/ui/icons/UploadIcon.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import PasswordField from '@repo/ui/components/PasswordField.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import FormToast from '@repo/ui/components/FormToast.svelte';
	import NotSetBadge from '@repo/ui/components/NotSetBadge.svelte';
	import SegmentedControl from '@repo/ui/components/SegmentedControl.svelte';
	import AppCard from '@repo/ui/components/AppCard.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import CancellationFeeModal from '$lib/components/CancellationFeeModal.svelte';
	import PlayerTransactionsPanel from '$lib/components/PlayerTransactionsPanel.svelte';
	import { cancellationFeeStatusLabel, formatThb } from '@repo/ui/payments';
	import type { OutstandingFee } from '$lib/types/session';
	import { toast } from '@repo/ui/toast/toast.svelte';
	import { AVATAR_OUTPUT_SIZE, normalizeImageForCrop } from '$lib/images/cropAvatar';
	import { validateAvatarFile, validateAvatarInput } from '$lib/validation/avatar';
	import { tagSuffixFromFull, toFullTag } from '$lib/validation/tag';
	import { normalizePhone, isEmail } from '$lib/validation/identifier';
	import {
		formatSignInMethodLabel,
		isOAuthSignInMethod,
		isPasswordSignInMethod,
		type PasswordSignInPreference
	} from '$lib/types/auth';
	import { storeSignInPreference } from '@repo/ui/signInPreference';
	import type { ActionData, PageData } from './$types';

	function phoneForInput(phone: string | null): string {
		if (!phone) return '';
		return phone.startsWith('+66') ? `0${phone.slice(3)}` : phone;
	}

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const formValues = $derived(
		form && 'values' in form
			? (form.values as { displayName?: string; tag?: string } | undefined)
			: null
	);
	const fieldErrors = $derived(
		form && 'fieldErrors' in form && !form.credentialsAction
			? (form.fieldErrors as { displayName?: string | null; tag?: string | null } | undefined)
			: null
	);

	const credentialsForm = $derived(form?.credentialsAction ? form : null);
	const credentialsFormValues = $derived(
		credentialsForm && 'values' in credentialsForm
			? (credentialsForm.values as {
					email?: string;
					phone?: string;
					signInPreference?: PasswordSignInPreference;
				})
			: null
	);
	const credentialsFieldErrors = $derived(
		credentialsForm && 'fieldErrors' in credentialsForm
			? (credentialsForm.fieldErrors as {
					email?: string | null;
					phone?: string | null;
					signInPreference?: string | null;
					currentPassword?: string | null;
				})
			: null
	);

	let saveLoading = $state(false);
	let credentialsLoading = $state(false);
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
	let credentialsSyncedAt = $state<string | null>(null);
	let credentialEmail = $state('');
	let credentialPhone = $state('');
	let signInPreference = $state<PasswordSignInPreference>('email');
	let currentPassword = $state('');
	let selectedFee = $state<OutstandingFee | null>(null);
	let feeModalOpen = $state(false);

	const displayedTag = $derived(toFullTag(tagSuffix));

	const oauthAccount = $derived(
		data.profile ? isOAuthSignInMethod(data.profile.sign_in_method) : false
	);

	const parsedCredentialEmail = $derived.by(() => {
		const trimmed = credentialEmail.trim();
		if (!trimmed) return null;
		return isEmail(trimmed) ? trimmed.toLowerCase() : null;
	});

	const parsedCredentialPhone = $derived(normalizePhone(credentialPhone.trim()));

	const emailSignInAvailable = $derived(!!parsedCredentialEmail);
	const phoneSignInAvailable = $derived(!!parsedCredentialPhone);

	const signInPreferenceOptions = $derived([
		{ value: 'email', label: 'Email', disabled: !emailSignInAvailable },
		{ value: 'phone', label: 'Phone', disabled: !phoneSignInAvailable }
	]);

	const hasCredentialChanges = $derived.by(() => {
		if (!data.profile) return false;

		const email = credentialEmail.trim().toLowerCase() || null;
		const phone = normalizePhone(credentialPhone.trim());

		if ((data.profile.email ?? null) !== email) return true;
		if ((data.profile.phone ?? null) !== phone) return true;

		return (
			!oauthAccount &&
			isPasswordSignInMethod(data.profile.sign_in_method) &&
			data.profile.sign_in_method !== signInPreference
		);
	});

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

	$effect(() => {
		if (!data.profile) return;

		if (credentialsFormValues) {
			credentialEmail = credentialsFormValues.email ?? data.profile.email ?? '';
			credentialPhone =
				credentialsFormValues.phone ?? phoneForInput(data.profile.phone);
			signInPreference =
				credentialsFormValues.signInPreference ??
				(isPasswordSignInMethod(data.profile.sign_in_method)
					? data.profile.sign_in_method
					: 'email');
			return;
		}

		const token = data.profile.updated_at;
		if (credentialsSyncedAt !== token) {
			credentialEmail = data.profile.email ?? '';
			credentialPhone = phoneForInput(data.profile.phone);
			signInPreference = isPasswordSignInMethod(data.profile.sign_in_method)
				? data.profile.sign_in_method
				: 'email';
			credentialsSyncedAt = token;
		}
	});

	$effect(() => {
		if (oauthAccount) return;

		if (signInPreference === 'email' && !emailSignInAvailable && phoneSignInAvailable) {
			signInPreference = 'phone';
		} else if (signInPreference === 'phone' && !phoneSignInAvailable && emailSignInAvailable) {
			signInPreference = 'email';
		}
	});

	const handleCredentialsSubmit: SubmitFunction = ({ cancel }) => {
		if (!hasCredentialChanges) {
			cancel();
			return;
		}

		credentialsLoading = true;
		return async ({ update, result }) => {
			await update({ reset: false });
			credentialsLoading = false;

			if (result.type === 'success') {
				const data = result.data as { signInPreference?: PasswordSignInPreference | null };
				if (data.signInPreference) {
					storeSignInPreference(data.signInPreference);
				}
				currentPassword = '';
			}
		};
	};

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
	function openFeeModal(fee: OutstandingFee) {
		selectedFee = fee;
		feeModalOpen = true;
	}

	function openFeeModalByPlayerId(playerId: string) {
		const fee = data.outstandingFees.find((entry) => entry.player_id === playerId);
		if (fee) {
			openFeeModal(fee);
		}
	}

	function closeFeeModal() {
		feeModalOpen = false;
		selectedFee = null;
	}

	const onFeeSubmitted = async () => {
		if (selectedFee) {
			selectedFee = { ...selectedFee, fee_status: 'submitted' };
		}
		toast.success('Payment submitted. Waiting for admin confirmation.');
		await invalidate('app:profile');
	};

	function onTagSuffixInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		tagSuffix = input.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4);
	}

	const inputClass =
		'w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20';
	const profileFieldClass = $derived(`${inputClass}${saveLoading ? ' opacity-0' : ''}`);
	const labelClass = 'mb-2 block text-sm font-medium text-slate-700';
	const hasOutstandingFees = $derived(data.outstandingFees.length > 0);
</script>

<FormToast message={data.loadError} variant="warning" token={data.loadError ?? ''} />
<FormToast message={form?.success ? 'Profile updated.' : null} variant="success" token={form?.at ?? ''} />
<FormToast message={form?.error && !form?.credentialsAction ? form.error : null} variant="error" token={form?.error ?? ''} />
<FormToast
	message={credentialsForm?.credentialsSuccess ? 'Sign-in details updated.' : null}
	variant="success"
	token={credentialsForm?.credentialsAt ?? ''}
/>
<FormToast message={credentialsForm?.error ?? null} variant="error" token={credentialsForm?.error ?? ''} />

{#snippet outstandingFeesSection()}
	<AppCard
		class="space-y-4 {hasOutstandingFees
			? 'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50/60'
			: 'border-dashed border-slate-200 bg-slate-50/60'}"
	>
		<div>
			<h2 class="font-medium text-slate-900">
				{hasOutstandingFees ? 'Action required' : 'Outstanding fees'}
			</h2>
			<p class="mt-1 text-sm {hasOutstandingFees ? 'text-amber-900/80' : 'text-slate-500'}">
				{#if hasOutstandingFees}
					Pay or wait for admin confirmation before joining another session.
				{:else}
					Late cancellation fees must be settled before you can join another session.
				{/if}
			</p>
		</div>
		{#if hasOutstandingFees}
			<ul class="divide-y divide-amber-100 overflow-hidden rounded-xl border border-amber-200 bg-white">
				{#each data.outstandingFees as fee (fee.player_id)}
					<li>
						<button
							type="button"
							class="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-amber-50/80"
							onclick={() => openFeeModal(fee)}
						>
							<div class="min-w-0">
								<p class="truncate font-semibold text-slate-900">{fee.session_name}</p>
								<p class="text-xs text-slate-500">{fee.club_name}</p>
							</div>
							<div class="flex shrink-0 items-center gap-3">
								<div class="text-right">
									<p class="text-sm font-semibold tabular-nums text-slate-900">
										{formatThb(fee.fee_owed)}
									</p>
									<p class="text-xs font-medium text-amber-800">
										{cancellationFeeStatusLabel(fee.fee_status)}
									</p>
								</div>
								<span class="text-brand-600" aria-hidden="true">→</span>
							</div>
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-slate-500">You're all clear — no fees owed.</p>
		{/if}
	</AppCard>
{/snippet}

<section class="space-y-6">
	<DashboardHero title="Profile" subtitle="Update your display name, tag, and avatar." />

	{#if data.profile}
		{#if hasOutstandingFees}
			{@render outstandingFeesSection()}
		{/if}

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
				variant="accent"
				disabled={!hasChanges || !!avatarError}
			>
				Save changes
			</SubmitButton>
		</form>
		</AppCard>

		<AppCard class="space-y-4">
			<h2 class="font-medium text-slate-900">Sign-in details</h2>
			<p class="text-sm text-slate-600">
				{#if oauthAccount}
					You signed in with {formatSignInMethodLabel(data.profile.sign_in_method)}. Add contact
					details below if you like — your social login stays the same.
				{:else}
					Update your email or phone. Both can be used to log in; choose which one the login page
					hints at by default.
				{/if}
			</p>

			<form
				method="POST"
				action="?/updateCredentials"
				class="space-y-4"
				use:enhance={handleCredentialsSubmit}
				aria-busy={credentialsLoading}
			>
				<div>
					<div class="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
						<label for="credentialEmail" class="text-sm font-medium text-slate-700">
							Email address
						</label>
						{#if !data.profile.email}
							<NotSetBadge />
						{/if}
					</div>
					<input
						id="credentialEmail"
						name="email"
						type="email"
						autocomplete="email"
						bind:value={credentialEmail}
						disabled={credentialsLoading}
						class={inputClass}
						placeholder="you@example.com"
					/>
					{#if credentialsFieldErrors?.email}
						<p class="mt-2 text-sm text-red-600">{credentialsFieldErrors.email}</p>
					{/if}
				</div>

				<div>
					<div class="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
						<label for="credentialPhone" class="text-sm font-medium text-slate-700">
							Phone number
						</label>
						{#if !data.profile.phone}
							<NotSetBadge />
						{/if}
					</div>
					<input
						id="credentialPhone"
						name="phone"
						type="tel"
						inputmode="tel"
						autocomplete="tel"
						bind:value={credentialPhone}
						disabled={credentialsLoading}
						class={inputClass}
						placeholder="0812345678"
					/>
					{#if credentialsFieldErrors?.phone}
						<p class="mt-2 text-sm text-red-600">{credentialsFieldErrors.phone}</p>
					{/if}
				</div>

				{#if !oauthAccount}
					<div>
						<span id="sign-in-preference-label" class={labelClass}>
							Default sign-in on login page
						</span>
						<SegmentedControl
							name="signInPreference"
							bind:value={signInPreference}
							disabled={credentialsLoading}
							labelledBy="sign-in-preference-label"
							options={signInPreferenceOptions}
						/>
						{#if credentialsFieldErrors?.signInPreference}
							<p class="mt-2 text-sm text-red-600">{credentialsFieldErrors.signInPreference}</p>
						{/if}
					</div>

					{#if hasCredentialChanges}
						<PasswordField
							id="currentPassword"
							name="currentPassword"
							label="Current password"
							autocomplete="current-password"
							bind:value={currentPassword}
							serverError={credentialsFieldErrors?.currentPassword ?? null}
						/>
					{/if}
				{/if}

				<SubmitButton
					loading={credentialsLoading}
					loadingLabel="Saving…"
					variant="accent"
					disabled={!hasCredentialChanges}
				>
					Save sign-in details
				</SubmitButton>
			</form>
		</AppCard>

		<PlayerTransactionsPanel
			transactions={data.transactions}
			onOpenCancellationFee={openFeeModalByPlayerId}
		/>

		<div class="app-muted-panel">
			<h2 class="mb-3 font-medium text-slate-900">Account details</h2>
			<dl class="space-y-3">
				<div>
					<dt class="text-slate-500">Sign-in method</dt>
					<dd class="font-medium text-slate-800">
						{formatSignInMethodLabel(data.profile.sign_in_method)}
					</dd>
				</div>
				{#if data.profile.email}
					<div>
						<dt class="text-slate-500">Email address</dt>
						<dd class="font-medium text-slate-800">{data.profile.email}</dd>
					</div>
				{/if}
				{#if data.profile.phone}
					<div>
						<dt class="text-slate-500">Phone number</dt>
						<dd class="font-medium text-slate-800">{phoneForInput(data.profile.phone)}</dd>
					</div>
				{/if}
				{#if oauthAccount}
					<div>
						<dt class="text-slate-500">Password</dt>
						<dd class="font-medium text-slate-800">Not used</dd>
					</div>
				{/if}
			</dl>
		</div>

		{#if !hasOutstandingFees}
			{@render outstandingFeesSection()}
		{/if}
	{/if}
</section>

<AvatarCropModal
	open={cropOpen}
	imageSrc={cropImageSrc}
	onConfirm={onCropConfirm}
	onCancel={onCropCancel}
/>

{#if selectedFee}
	<CancellationFeeModal
		open={feeModalOpen}
		playerId={selectedFee.player_id}
		amount={selectedFee.fee_owed}
		promptpayTarget={selectedFee.promptpay_target}
		feeStatus={selectedFee.fee_status}
		sessionLabel="{selectedFee.session_name} · {selectedFee.club_name}"
		submitAction="?/submitFee"
		onClose={closeFeeModal}
		onSubmitted={onFeeSubmitted}
	/>
{/if}
