<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		getWorkspaceHomePath,
		type AdminWorkspaceId,
		type AdminWorkspaceOption
	} from '$lib/adminWorkspace';
	import UserGroupIcon from '@repo/ui/icons/UserGroupIcon.svelte';
	import Squares2x2Icon from '@repo/ui/icons/Squares2x2Icon.svelte';
	import MenuSelectedMark from '@repo/ui/components/MenuSelectedMark.svelte';
	import SettingsIcon from '@repo/ui/icons/SettingsIcon.svelte';
	import type { Component } from 'svelte';

	let {
		options,
		currentWorkspace,
		canSwitch
	}: {
		options: AdminWorkspaceOption[];
		currentWorkspace: AdminWorkspaceId;
		canSwitch: boolean;
	} = $props();

	const WORKSPACE_ICONS: Record<AdminWorkspaceId, Component<{ class?: string }>> = {
		super: SettingsIcon,
		club: UserGroupIcon
	};

	let open = $state(false);
	let switching = $state(false);
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let menuTop = $state(0);
	let menuRight = $state(0);

	const currentOption = $derived(
		options.find((option) => option.id === currentWorkspace) ?? options[0] ?? null
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

	async function switchWorkspace(workspaceId: AdminWorkspaceId) {
		if (switching || workspaceId === currentWorkspace) return;

		switching = true;
		closeMenu();

		const body = new FormData();
		body.set('mode', workspaceId);
		const homePath = getWorkspaceHomePath(workspaceId);

		try {
			const response = await fetch('/set-dashboard-mode', {
				method: 'POST',
				body,
				credentials: 'same-origin'
			});

			if (response.status >= 400) return;

			await goto(homePath, { invalidateAll: true, replaceState: true });
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

{#if canSwitch && options.length > 1}
	<div class="relative shrink-0">
		<button
			bind:this={triggerEl}
			type="button"
			class="app-nav-icon-btn app-nav-icon-btn--admin-ws"
			aria-expanded={open}
			aria-busy={switching}
			aria-haspopup="menu"
			aria-label="Switch admin workspace ({currentOption?.label ?? 'Admin'})"
			title="Admin workspace"
			disabled={switching}
			onclick={toggleMenu}
		>
			{#if switching}
				<span
					class="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700"
					aria-hidden="true"
				></span>
			{:else}
				<Squares2x2Icon class="h-5 w-5 text-brand-700" />
			{/if}
		</button>

		{#if open}
			<button
				type="button"
				class="fixed inset-0 z-40 cursor-default"
				aria-label="Close workspace menu"
				onclick={closeMenu}
			></button>

			<div
				class="fixed z-50 w-56 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
				style:top="{menuTop}px"
				style:right="{menuRight}px"
				role="menu"
			>
				<div class="border-b border-slate-100 px-3 py-2.5">
					<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
						Admin workspace
					</p>
				</div>

				<div class="space-y-0.5 p-1.5">
					{#each options as option (option.id)}
						{@const OptionIcon = WORKSPACE_ICONS[option.id]}
						<button
							type="button"
							role="menuitem"
							aria-current={option.id === currentWorkspace ? 'true' : undefined}
							disabled={switching || option.id === currentWorkspace}
							class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition {option.id ===
							currentWorkspace
								? 'bg-brand-50 text-brand-800'
								: 'text-slate-700 hover:bg-slate-100'}"
							onclick={() => switchWorkspace(option.id)}
						>
							<span
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm"
							>
								<OptionIcon class="h-4 w-4" />
							</span>
							<span class="min-w-0">
								<span class="block font-semibold">{option.label}</span>
								<span class="block text-xs text-slate-500">{option.shortLabel} dashboard</span>
							</span>
							{#if option.id === currentWorkspace}
								<MenuSelectedMark />
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}
