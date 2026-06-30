<script lang="ts">
	import LogOutIcon from '@repo/ui/icons/LogOutIcon.svelte';
	import UserIcon from '@repo/ui/icons/UserIcon.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import type { Profile } from '$lib/types/auth';

	let {
		profile
	}: {
		profile: Pick<Profile, 'display_name' | 'avatar_url'> & { tag: string | null } | null;
	} = $props();

	let open = $state(false);

	function toggleMenu() {
		open = !open;
	}

	function closeMenu() {
		open = false;
	}
</script>

{#if profile}
	<div class="relative shrink-0">
		<button
			type="button"
			class="block rounded-full p-0.5 ring-2 ring-transparent transition hover:ring-brand-200 focus:outline-none focus-visible:ring-brand-600"
			aria-expanded={open}
			aria-haspopup="menu"
			aria-label="Account menu"
			onclick={toggleMenu}
		>
			<UserAvatar
				displayName={profile.display_name}
				avatarUrl={profile.avatar_url}
				size="sm"
			/>
		</button>

		{#if open}
			<button
				type="button"
				class="fixed inset-0 z-40 cursor-default"
				aria-label="Close account menu"
				onclick={closeMenu}
			></button>

			<div
				class="absolute right-0 top-full z-50 mt-2 w-56 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
				role="menu"
			>
				<div class="bg-linear-to-br from-brand-50 to-brand-100/80 px-3 py-3">
					<div class="flex items-center gap-3">
						<UserAvatar
							displayName={profile.display_name}
							avatarUrl={profile.avatar_url}
							size="lg"
						/>

						<div class="min-w-0">
							<p
								class="truncate text-base font-semibold text-slate-900"
								title={profile.display_name}
							>
								{profile.display_name}
							</p>
							{#if profile.tag}
								<TagPill tag={profile.tag} class="mt-1 bg-white/90 ring-brand-200" />
							{/if}
						</div>
					</div>
				</div>

				<div class="space-y-0.5 p-1.5">
					<a
						href="/profile"
						role="menuitem"
						class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
						onclick={closeMenu}
					>
						<UserIcon class="h-5 w-5 shrink-0 text-brand-700" />
						Profile
					</a>

					<form method="POST" action="/logout" role="none">
						<SubmitButton
							type="submit"
							variant="ghost"
							class="flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
						>
							<LogOutIcon class="h-5 w-5 shrink-0 text-slate-500" />
							Log out
						</SubmitButton>
					</form>
				</div>
			</div>
		{/if}
	</div>
{/if}
