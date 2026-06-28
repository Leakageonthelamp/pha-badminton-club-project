<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import ActionRowLink from '@repo/ui/components/ActionRowLink.svelte';
	import AppModal from '@repo/ui/components/AppModal.svelte';
	import DashboardHero from '@repo/ui/components/DashboardHero.svelte';
	import FormToast from '@repo/ui/components/FormToast.svelte';
	import NotSetBadge from '@repo/ui/components/NotSetBadge.svelte';
	import PasswordField from '@repo/ui/components/PasswordField.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import BuildingIcon from '@repo/ui/icons/BuildingIcon.svelte';
	import FacebookIcon from '@repo/ui/icons/FacebookIcon.svelte';
	import GoogleIcon from '@repo/ui/icons/GoogleIcon.svelte';
	import RefreshIcon from '@repo/ui/icons/RefreshIcon.svelte';
	import SettingsIcon from '@repo/ui/icons/SettingsIcon.svelte';
	import UserIcon from '@repo/ui/icons/UserIcon.svelte';
	import { adminRoleBadgeClass, adminRoleHeroBadgeClass } from '$lib/adminRoleHero';
	import { USER_DELETE_CONFIRM_PHRASE } from '$lib/config/user';
	import { PASSWORD_MIN_LENGTH } from '$lib/validation/password';
	import {
		appRoleLabel,
		formatSignInMethodLabel,
		isPasswordSignInMethod
	} from '$lib/types/auth';
	import { toast } from '@repo/ui/toast/toast.svelte';
	import type { ActionData, PageData } from './$types';

	const inputClass =
		'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let passwordModalOpen = $state(false);
	let banModalOpen = $state(false);
	let deleteModalOpen = $state(false);
	let resetPassword = $state('');
	let deleteConfirmText = $state('');
	let resetLoading = $state(false);
	let banLoading = $state(false);
	let deleteLoading = $state(false);

	const canResetPassword = $derived(isPasswordSignInMethod(data.profile.sign_in_method));
	const isBanned = $derived(data.authSummary?.isBanned ?? false);
	const deleteConfirmed = $derived(deleteConfirmText === USER_DELETE_CONFIRM_PHRASE);
	const canDelete = $derived(
		data.profile.app_role !== 'super_admin' && data.ownedClubCount === 0
	);
	const roleLabel = $derived(appRoleLabel(data.profile.app_role));
	const roleBadgeClass = $derived(adminRoleBadgeClass(data.profile.app_role));
	const roleHeroBadgeClass = $derived(adminRoleHeroBadgeClass(data.profile.app_role));
	const toastMessage = $derived(form?.message ?? null);
	const toastVariant = $derived(form?.success ? 'success' : 'error');

	function formatDate(value: string | null | undefined): string {
		if (!value) return '—';
		return new Date(value).toLocaleString(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short',
			hour12: false
		});
	}

	const handleResetPassword: SubmitFunction = () => {
		resetLoading = true;
		return async ({ result, update }) => {
			resetLoading = false;
			if (result.type === 'success') {
				passwordModalOpen = false;
				resetPassword = '';
			}
			await update();
		};
	};

	const handleBan: SubmitFunction = () => {
		banLoading = true;
		return async ({ result, update }) => {
			banLoading = false;
			if (result.type === 'success') {
				banModalOpen = false;
			}
			await update();
		};
	};

	const handleDelete: SubmitFunction = () => {
		deleteLoading = true;
		return async ({ result, update }) => {
			deleteLoading = false;
			if (result.type === 'redirect') {
				toast.success('User deleted.');
			}
			await update();
		};
	};
</script>

<section class="space-y-6">
	<DashboardHero
		eyebrow="User detail"
		title={data.profile.display_name}
		tag={data.profile.tag}
		roleLabel={roleLabel}
		roleBadgeClass={roleHeroBadgeClass}
	>
		{#if isBanned}
			<span class="app-hero-badge app-hero-badge--danger">Banned</span>
		{/if}
	</DashboardHero>

	<FormToast message={toastMessage} variant={toastVariant} token={toastMessage ?? ''} />

	<section class="app-detail-section">
		<div class="app-detail-profile-band">
			<div class="flex items-center gap-4">
				<UserAvatar
					displayName={data.profile.display_name}
					avatarUrl={data.profile.avatar_url}
					size="lg"
				/>
				<div class="min-w-0">
					<p class="truncate text-lg font-semibold text-slate-900">{data.profile.display_name}</p>
					<div class="mt-1 flex flex-wrap items-center gap-2">
						{#if data.profile.tag}
							<TagPill tag={data.profile.tag} />
						{/if}
						<span class="app-role-badge {roleBadgeClass}">{roleLabel}</span>
						{#if isBanned}
							<span class="app-role-badge bg-red-50 text-red-800 ring-1 ring-red-200/80">Banned</span>
						{/if}
					</div>
					<p class="mt-1 text-sm text-slate-600">
						{formatSignInMethodLabel(data.profile.sign_in_method)} sign-in
					</p>
				</div>
			</div>
		</div>
		<div class="app-detail-section-body">
			<div class="app-detail-section-header">
				<span class="app-detail-section-icon" aria-hidden="true">
					<UserIcon class="h-5 w-5" />
				</span>
				<div>
					<h2 class="text-lg font-semibold text-slate-900">Contact</h2>
					<p class="text-sm text-slate-500">How this user signs in and can be reached</p>
				</div>
			</div>
			<div class="app-detail-contact-grid">
				<div class="app-detail-contact-item app-detail-contact-item--wide">
					<p class="app-detail-contact-label">Email</p>
					<p class="app-detail-contact-value">
						{#if data.profile.email}
							<span class="break-all">{data.profile.email}</span>
						{:else}
							<NotSetBadge />
						{/if}
					</p>
				</div>
				<div class="app-detail-contact-item">
					<p class="app-detail-contact-label">Phone</p>
					<p class="app-detail-contact-value">
						{#if data.profile.phone}
							<span class="truncate">{data.profile.phone}</span>
						{:else}
							<NotSetBadge />
						{/if}
					</p>
				</div>
				<div class="app-detail-contact-item">
					<p class="app-detail-contact-label">Sign-in method</p>
					<p class="app-detail-contact-value">
						{#if data.profile.sign_in_method === 'google'}
							<GoogleIcon class="h-5 w-5 shrink-0" />
						{:else if data.profile.sign_in_method === 'facebook'}
							<FacebookIcon class="h-5 w-5 shrink-0" />
						{:else}
							<UserIcon class="h-5 w-5 shrink-0 text-brand-700" />
						{/if}
						<span>{formatSignInMethodLabel(data.profile.sign_in_method)}</span>
					</p>
				</div>
			</div>
		</div>
	</section>

	<section class="app-detail-section">
		<div class="app-detail-section-body">
			<div class="app-detail-section-header">
				<span class="app-detail-section-icon" aria-hidden="true">
					<BuildingIcon class="h-5 w-5" />
				</span>
				<div>
					<h2 class="text-lg font-semibold text-slate-900">Role & clubs</h2>
					<p class="text-sm text-slate-500">Platform role and club assignments</p>
				</div>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-sm text-slate-600">App role</span>
				<span class="app-role-badge {roleBadgeClass}">{roleLabel}</span>
			</div>
			{#if data.managedClubs.length}
				<div class="space-y-2">
					<p class="text-sm font-medium text-slate-700">
						Club admin for {data.managedClubs.length} club{data.managedClubs.length === 1 ? '' : 's'}
					</p>
					<div class="space-y-2">
						{#each data.managedClubs as club (club.id)}
							<ActionRowLink
								href="/clubs/{club.id}"
								title={club.name}
								description="Club admin access"
								icon={BuildingIcon}
								accent="indigo"
							/>
						{/each}
					</div>
				</div>
			{:else}
				<p class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
					Not assigned as club admin for any club.
				</p>
			{/if}
			{#if data.ownedClubs.length}
				<div class="space-y-2">
					<p class="text-sm font-medium text-amber-900">Owns {data.ownedClubs.length} club{data.ownedClubs.length === 1 ? '' : 's'}</p>
					<ul class="divide-y divide-amber-200/80 rounded-xl border border-amber-200 bg-amber-50">
						{#each data.ownedClubs as club (club.id)}
							<li class="px-3 py-2.5 text-sm font-medium text-amber-900">{club.name}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	</section>

	<section class="app-detail-section">
		<div class="app-detail-section-body">
			<div class="app-detail-section-header">
				<span class="app-detail-section-icon" aria-hidden="true">
					<RefreshIcon class="h-5 w-5" />
				</span>
				<div>
					<h2 class="text-lg font-semibold text-slate-900">Account activity</h2>
					<p class="text-sm text-slate-500">Timestamps and auth providers</p>
				</div>
			</div>
			<dl class="app-detail-meta-grid">
				<div class="app-detail-meta-item">
					<dt class="app-detail-meta-label">Created</dt>
					<dd class="app-detail-meta-value">{formatDate(data.profile.created_at)}</dd>
				</div>
				<div class="app-detail-meta-item">
					<dt class="app-detail-meta-label">Updated</dt>
					<dd class="app-detail-meta-value">{formatDate(data.profile.updated_at)}</dd>
				</div>
				<div class="app-detail-meta-item">
					<dt class="app-detail-meta-label">Last sign-in</dt>
					<dd class="app-detail-meta-value">{formatDate(data.authSummary?.lastSignInAt)}</dd>
				</div>
				<div class="app-detail-meta-item">
					<dt class="app-detail-meta-label">Email confirmed</dt>
					<dd class="app-detail-meta-value">{formatDate(data.authSummary?.emailConfirmedAt)}</dd>
				</div>
				<div class="app-detail-meta-item sm:col-span-2">
					<dt class="app-detail-meta-label">Auth providers</dt>
					<dd class="app-detail-meta-value">
						{#if data.authSummary?.providers.length}
							<span class="flex flex-wrap gap-2">
								{#each data.authSummary.providers as provider (provider)}
									<span class="app-role-badge bg-slate-100 text-slate-700 ring-1 ring-slate-200/80">
										{provider}
									</span>
								{/each}
							</span>
						{:else}
							<NotSetBadge />
						{/if}
					</dd>
				</div>
			</dl>
		</div>
	</section>

	<section class="app-detail-section">
		<div class="app-detail-section-body">
			<div class="app-detail-section-header">
				<span class="app-detail-section-icon" aria-hidden="true">
					<SettingsIcon class="h-5 w-5" />
				</span>
				<div>
					<h2 class="text-lg font-semibold text-slate-900">Actions</h2>
					<p class="text-sm text-slate-500">Set password, ban, and access controls</p>
				</div>
			</div>
			<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
			{#if canResetPassword}
				<button
					type="button"
					class="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
					onclick={() => (passwordModalOpen = true)}
				>
					Set password
				</button>
			{:else}
				<p class="text-sm text-slate-500">
					Setting a password is not available for OAuth-only accounts.
				</p>
			{/if}

			{#if isBanned}
				<form method="POST" action="?/unban" use:enhance={handleBan}>
					<SubmitButton variant="secondary" loading={banLoading} loadingLabel="Unbanning…">
						Unban user
					</SubmitButton>
				</form>
			{:else}
				<button
					type="button"
					class="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
					onclick={() => (banModalOpen = true)}
				>
					Ban user
				</button>
			{/if}
			</div>
		</div>
	</section>

	<section class="rounded-2xl border border-red-300 bg-red-50 p-4">
		<h2 class="text-lg font-semibold text-red-900">Danger zone</h2>
		{#if data.profile.app_role === 'super_admin'}
			<p class="mt-2 text-sm text-red-800">Super admin accounts cannot be deleted.</p>
		{:else if data.ownedClubCount > 0}
			<p class="mt-2 text-sm text-red-800">
				Reassign ownership for {data.ownedClubCount} club{data.ownedClubCount === 1 ? '' : 's'} before
				deleting this user.
			</p>
		{:else}
			<p class="mt-2 text-sm text-red-800">
				Permanently deletes this account and profile. This cannot be undone.
			</p>
			<button
				type="button"
				class="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-red-700 sm:w-auto"
				onclick={() => (deleteModalOpen = true)}
			>
				Delete user permanently
			</button>
		{/if}
	</section>
</section>

{#if passwordModalOpen}
	<AppModal open={passwordModalOpen} labelledBy="reset-password-title" onClose={() => (passwordModalOpen = false)}>
		<div class="overflow-hidden rounded-2xl bg-white shadow-xl">
			<div class="border-b border-slate-100 px-4 py-4">
				<h2 id="reset-password-title" class="text-lg font-semibold text-slate-900">
					Set password
				</h2>
				<p class="mt-2 text-sm text-slate-600">
					Users cannot change their password on their own. Set a new password here and share it
					with them through a secure channel.
				</p>
			</div>
			<form
				method="POST"
				action="?/resetPassword"
				class="space-y-4 p-4"
				use:enhance={handleResetPassword}
			>
				<PasswordField
					id="resetPassword"
					name="password"
					label="New password"
					autocomplete="new-password"
					bind:value={resetPassword}
					minlength={PASSWORD_MIN_LENGTH}
				/>
				<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<SubmitButton
						type="button"
						variant="secondary"
						class="sm:!w-auto"
						disabled={resetLoading}
						onclick={() => (passwordModalOpen = false)}
					>
						Cancel
					</SubmitButton>
					<SubmitButton loading={resetLoading} loadingLabel="Saving…" class="sm:!w-auto">
						Set password
					</SubmitButton>
				</div>
			</form>
		</div>
	</AppModal>
{/if}

{#if banModalOpen}
	<AppModal open={banModalOpen} labelledBy="ban-user-title" onClose={() => (banModalOpen = false)}>
		<div class="overflow-hidden rounded-2xl bg-white shadow-xl">
			<div class="border-b border-red-100 bg-red-50 px-4 py-4">
				<h2 id="ban-user-title" class="text-lg font-semibold text-red-900">Ban this user?</h2>
				<p class="mt-2 text-sm text-red-800">
					The user will not be able to sign in until unbanned.
				</p>
			</div>
			<form method="POST" action="?/ban" class="p-4" use:enhance={handleBan}>
				<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<SubmitButton
						type="button"
						variant="secondary"
						class="sm:!w-auto"
						disabled={banLoading}
						onclick={() => (banModalOpen = false)}
					>
						Cancel
					</SubmitButton>
					<SubmitButton
						loading={banLoading}
						loadingLabel="Banning…"
						class="!w-full border-transparent bg-red-600 text-white hover:!bg-red-700 sm:!w-auto"
					>
						Ban user
					</SubmitButton>
				</div>
			</form>
		</div>
	</AppModal>
{/if}

{#if deleteModalOpen && canDelete}
	<AppModal open={deleteModalOpen} labelledBy="delete-user-title" onClose={() => (deleteModalOpen = false)}>
		<div class="overflow-hidden rounded-2xl bg-white shadow-xl">
			<div class="border-b border-red-100 bg-red-50 px-4 py-4">
				<h2 id="delete-user-title" class="text-lg font-semibold text-red-900">Delete this user?</h2>
				<p class="mt-2 text-sm text-red-800">
					This permanently deletes <span class="font-semibold">{data.profile.display_name}</span>.
				</p>
			</div>
			<form method="POST" action="?/delete" class="space-y-4 p-4" use:enhance={handleDelete}>
				<div>
					<label for="deleteConfirmText" class="mb-2 block text-sm font-medium text-slate-700">
						Type <span class="font-mono text-red-700">{USER_DELETE_CONFIRM_PHRASE}</span> to confirm
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
						onclick={() => (deleteModalOpen = false)}
					>
						Cancel
					</SubmitButton>
					<SubmitButton
						loading={deleteLoading}
						loadingLabel="Deleting…"
						disabled={!deleteConfirmed}
						class="!w-full border-transparent bg-red-600 text-white hover:!bg-red-700 disabled:!bg-red-300 sm:!w-auto"
					>
						Delete permanently
					</SubmitButton>
				</div>
			</form>
		</div>
	</AppModal>
{/if}
