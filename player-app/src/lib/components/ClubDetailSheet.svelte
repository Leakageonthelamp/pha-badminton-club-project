<script lang="ts">
	import { browser } from '$app/environment';
	import TagPill from '$lib/components/TagPill.svelte';
	import type { ClubAdminPublic, ClubPublic } from '$lib/types/club';

	let {
		open = false,
		clubId = null,
		preview = null,
		onClose
	}: {
		open?: boolean;
		clubId?: string | null;
		preview?: ClubPublic | null;
		onClose: () => void;
	} = $props();

	let show = $state(false);
	let visible = $state(false);
	let loading = $state(false);
	let loadError = $state<string | null>(null);
	let club = $state<ClubPublic | null>(null);
	let admins = $state<ClubAdminPublic[]>([]);

	const title = $derived(club?.name ?? preview?.name ?? 'Club');
	const description = $derived(club?.description ?? preview?.description ?? '');

	const skeletonClass = 'animate-pulse rounded-lg bg-slate-200';

	const close = () => {
		visible = false;
		window.setTimeout(onClose, 220);
	};

	const onKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			close();
		}
	};

	$effect(() => {
		if (!browser) return;

		if (!open || !clubId) {
			visible = false;
			const timer = window.setTimeout(() => {
				show = false;
				club = null;
				admins = [];
				loadError = null;
				loading = false;
			}, 240);
			return () => window.clearTimeout(timer);
		}

		show = true;
		loadError = null;
		club = preview;
		admins = [];
		loading = true;

		const frame = window.requestAnimationFrame(() => {
			visible = true;
		});

		let cancelled = false;

		fetch(`/api/clubs/${clubId}`)
			.then(async (response) => {
				if (!response.ok) {
					const message =
						response.status === 404 ? 'Club not found.' : 'Could not load club details.';
					throw new Error(message);
				}
				return response.json() as Promise<{ club: ClubPublic; admins: ClubAdminPublic[] }>;
			})
			.then((detail) => {
				if (cancelled) return;
				club = detail.club;
				admins = detail.admins ?? [];
			})
			.catch((err) => {
				if (cancelled) return;
				loadError = err instanceof Error ? err.message : 'Could not load club details.';
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});

		return () => {
			cancelled = true;
			window.cancelAnimationFrame(frame);
		};
	});

	$effect(() => {
		if (!browser || !show) return;

		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

{#if browser && show}
	<div class="bottom-sheet-root" class:bottom-sheet-root--open={visible}>
		<button
			type="button"
			class="bottom-sheet-backdrop"
			aria-label="Close club details"
			onclick={close}
		></button>

		<div
			class="bottom-sheet-panel"
			class:bottom-sheet-panel--open={visible}
			role="dialog"
			aria-modal="true"
			aria-labelledby="club-sheet-title"
		>
			<div class="flex shrink-0 justify-center pt-3 pb-2">
				<div class="h-1 w-10 rounded-full bg-slate-300" aria-hidden="true"></div>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
				<div class="flex items-start justify-between gap-3">
					<h2 id="club-sheet-title" class="text-xl font-semibold text-slate-900">{title}</h2>
					<button
						type="button"
						class="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
						onclick={close}
					>
						Close
					</button>
				</div>

				{#if description}
					<p class="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>
				{:else if !loading}
					<p class="mt-3 text-sm text-slate-500">No description provided.</p>
				{/if}

				<div class="mt-6 rounded-2xl border border-slate-200 bg-white p-4" aria-busy={loading}>
					<h3 class="text-base font-semibold text-slate-900">Club admins</h3>
					<p class="mt-1 text-sm text-slate-600">People who manage this club.</p>

					{#if loading}
						<ul
							class="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200"
							aria-label="Loading club admins"
						>
							{#each [0, 1, 2] as row (row)}
								<li class="flex items-center justify-between gap-3 bg-white px-4 py-3">
									<div class="{skeletonClass} h-4 w-32 max-w-[60%]"></div>
									<div class="{skeletonClass} h-6 w-16 rounded-full"></div>
								</li>
							{/each}
						</ul>
					{:else if loadError}
						<p class="mt-4 text-sm text-red-600">{loadError}</p>
					{:else if admins.length === 0}
						<p class="mt-4 text-sm text-slate-500">No admins assigned yet.</p>
					{:else}
						<ul
							class="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200"
						>
							{#each admins as admin (admin.user_id)}
								<li class="flex items-center justify-between gap-3 bg-white px-4 py-3">
									<p class="min-w-0 truncate font-medium text-slate-900">{admin.display_name}</p>
									{#if admin.tag}
										<TagPill tag={admin.tag} />
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
