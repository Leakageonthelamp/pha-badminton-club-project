<script lang="ts">
	import LogOutIcon from '@repo/ui/icons/LogOutIcon.svelte';
	import UserIcon from '@repo/ui/icons/UserIcon.svelte';
	import SubmitButton from '@repo/ui/components/SubmitButton.svelte';
	import TagPill from '@repo/ui/components/TagPill.svelte';
	import UserAvatar from '@repo/ui/components/UserAvatar.svelte';
	import { appRoleLabel, type AppRole, type Profile } from '$lib/types/auth';

	let {
		profile
	}: {
		profile:
			| (Pick<Profile, 'display_name' | 'avatar_url' | 'app_role'> & { tag: string | null })
			| null;
	} = $props();

	let open = $state(false);
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let menuTop = $state(0);
	let menuRight = $state(0);

	const roleLabel = $derived(profile ? appRoleLabel(profile.app_role as AppRole) : '');

	function updateMenuPosition() {
		if (!triggerEl) return;

		const rect = triggerEl.getBoundingClientRect();
		menuTop = rect.bottom + 8;
		menuRight = Math.max(8, window.innerWidth - rect.right);
	}

	function toggleMenu() {
		open = !open;
		if (open) updateMenuPosition();
	}

	function closeMenu() {
		open = false;
	}

	$effect(() => {
		if (!open) return;

		updateMenuPosition();
		const onLayoutChange = () => updateMenuPosition();
		window.addEventListener('resize', onLayoutChange);
		window.addEventListener('scroll', onLayoutChange, true);

		return () => {
			window.removeEventListener('resize', onLayoutChange);
			window.removeEventListener('scroll', onLayoutChange, true);
		};
	});
</script>

{#if profile}
	<div class="relative shrink-0">
		<button
			bind:this={triggerEl}
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
				class="fixed z-50 w-56 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
				style:top="{menuTop}px"
				style:right="{menuRight}px"
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
							<div class="mt-1 flex flex-col items-start gap-1">
								{#if profile.tag}
									<TagPill tag={profile.tag} class="bg-white/90 ring-brand-200" />
								{/if}
								<span
									class="inline-flex items-center rounded-full bg-brand-800 px-2 py-0.5 text-xs font-semibold text-white shadow-sm"
								>
									{roleLabel}
								</span>
							</div>
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
