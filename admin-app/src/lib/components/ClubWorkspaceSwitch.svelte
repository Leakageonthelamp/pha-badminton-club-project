<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import {
		clubWorkspaceState,
		selectClub,
		type ClubWorkspaceOption
	} from '$lib/clubWorkspace.svelte';
	import BuildingIcon from '@repo/ui/icons/BuildingIcon.svelte';
	import MenuSelectedMark from '@repo/ui/components/MenuSelectedMark.svelte';

	let { clubs }: { clubs: ClubWorkspaceOption[] } = $props();

	let open = $state(false);
	let switching = $state(false);
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let menuTop = $state(0);
	let menuRight = $state(0);

	const canSwitch = $derived(clubs.length > 1);
	const activeClub = $derived(
		clubs.find((club) => club.id === clubWorkspaceState.selectedClubId) ?? clubs[0] ?? null
	);

	function updateMenuPosition() {
		if (!triggerEl) return;

		const rect = triggerEl.getBoundingClientRect();
		menuTop = rect.bottom + 8;
		menuRight = Math.max(8, window.innerWidth - rect.right);
	}

	function toggleMenu() {
		if (switching) return;
		open = !open;
		if (open) updateMenuPosition();
	}

	function closeMenu() {
		open = false;
	}

	async function switchClub(clubId: string) {
		if (switching || clubId === clubWorkspaceState.selectedClubId) {
			closeMenu();
			return;
		}

		switching = true;
		selectClub(clubId);
		closeMenu();

		try {
			const clubMatch = page.url.pathname.match(/^\/clubs\/([^/]+)/);
			if (clubMatch) {
				await goto(`/clubs/${clubId}`, { invalidateAll: true, replaceState: true });
				return;
			}

			if (page.url.pathname === '/dashboard') {
				await invalidateAll();
			}
		} finally {
			switching = false;
		}
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

{#if canSwitch && activeClub}
	<div class="relative shrink-0">
		<button
			bind:this={triggerEl}
			type="button"
			class="app-nav-icon-btn app-nav-icon-btn--club-ws"
			aria-expanded={open}
			aria-busy={switching}
			aria-haspopup="menu"
			aria-label="Switch club workspace ({activeClub.name})"
			title="Club workspace"
			disabled={switching}
			onclick={toggleMenu}
		>
			{#if switching}
				<span
					class="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700"
					aria-hidden="true"
				></span>
			{:else}
				<BuildingIcon class="h-5 w-5 text-brand-700" />
			{/if}
		</button>

		{#if open}
			<button
				type="button"
				class="fixed inset-0 z-40 cursor-default"
				aria-label="Close club menu"
				onclick={closeMenu}
			></button>

			<div
				class="fixed z-50 w-64 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
				style:top="{menuTop}px"
				style:right="{menuRight}px"
				role="menu"
			>
				<div class="border-b border-slate-100 px-3 py-2.5">
					<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
						Club workspace
					</p>
					<p class="mt-0.5 text-xs text-slate-400">Saved on this device</p>
				</div>

				<div class="space-y-0.5 p-1.5">
					{#each clubs as club (club.id)}
						<button
							type="button"
							role="menuitem"
							aria-current={club.id === clubWorkspaceState.selectedClubId ? 'true' : undefined}
							disabled={switching || club.id === clubWorkspaceState.selectedClubId}
							class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition {club.id ===
							clubWorkspaceState.selectedClubId
								? 'bg-brand-50 text-brand-800'
								: 'text-slate-700 hover:bg-slate-100'}"
							onclick={() => switchClub(club.id)}
						>
							<span
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm"
							>
								<BuildingIcon class="h-4 w-4" />
							</span>
							<span class="min-w-0">
								<span class="block truncate font-semibold">{club.name}</span>
								<span class="block text-xs text-slate-500">
									{club.is_active ? 'Active club' : 'Inactive club'}
								</span>
							</span>
							{#if club.id === clubWorkspaceState.selectedClubId}
								<MenuSelectedMark />
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}
