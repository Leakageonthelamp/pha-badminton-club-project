<script lang="ts">
	import AppLogo from '$lib/components/AppLogo.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
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
			{#if data.profile.avatar_url}
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

		{#if form?.error}
			<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
				{form.error}
			</div>
		{/if}

		<form method="POST" action="?/updateProfile" enctype="multipart/form-data" class="space-y-4">
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
				<label for="avatar" class="mb-2 block text-sm font-medium text-slate-700">Avatar</label>
				<input
					id="avatar"
					name="avatar"
					type="file"
					accept="image/*"
					class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-800"
				/>
			</div>

			<button
				type="submit"
				class="w-full rounded-xl bg-brand-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
			>
				Save changes
			</button>
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
