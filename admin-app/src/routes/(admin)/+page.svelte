<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<section class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold text-slate-900">Clubs</h1>
			<p class="mt-2 text-sm text-slate-600">Create and manage clubs and their admins.</p>
		</div>
		<a
			href="/clubs/new"
			class="inline-flex w-full items-center justify-center rounded-xl bg-brand-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 sm:w-auto"
		>
			Create club
		</a>
	</div>

	{#if data.clubs.length === 0}
		<div class="rounded-2xl border border-slate-200 bg-white p-4 text-center">
			<p class="text-slate-600">No clubs yet.</p>
			<a
				href="/clubs/new"
				class="mt-3 inline-block text-sm font-medium text-brand-700 hover:text-brand-800"
			>
				Create your first club
			</a>
		</div>
	{:else}
		<ul class="space-y-3">
			{#each data.clubs as club (club.id)}
				<li>
					<a
						href="/clubs/{club.id}"
						class="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-200 hover:shadow-sm"
					>
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0">
								<h2 class="text-lg font-semibold text-slate-900">{club.name}</h2>
								{#if club.description}
									<p class="mt-1 line-clamp-2 text-sm text-slate-600">{club.description}</p>
								{/if}
							</div>
							<div class="flex shrink-0 flex-wrap gap-2">
								<span
									class="rounded-full px-3 py-1 text-xs font-medium {club.is_active
										? 'bg-emerald-50 text-emerald-800'
										: 'bg-slate-100 text-slate-600'}"
								>
									{club.is_active ? 'Active' : 'Inactive'}
								</span>
								<span class="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800">
									Max {club.max_active_sessions} sessions
								</span>
							</div>
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
