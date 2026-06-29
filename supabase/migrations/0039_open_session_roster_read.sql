-- Open/in-progress session rosters and capacity counts are visible to all signed-in
-- players (browse before join). session_players RLS previously only exposed own rows
-- to non-members, so capacity showed 0/N and post-join refresh could look unchanged.

create policy "Players can view open session rosters"
on public.session_players
for select
using (
	auth.uid() is not null
	and status in ('waiting', 'queued', 'confirmed')
	and exists (
		select 1
		from public.sessions s
		where s.id = session_players.session_id
			and s.status in ('open', 'in_progress')
	)
);

create or replace function public.is_open_session_participant_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.session_players sp
		inner join public.sessions s on s.id = sp.session_id
		where sp.user_id = p_user_id
			and sp.status in ('waiting', 'queued', 'confirmed')
			and s.status in ('open', 'in_progress')
	);
$$;

grant execute on function public.is_open_session_participant_profile(uuid) to authenticated;

create policy "Players can view open session participant profiles"
on public.profiles
for select
using (
	auth.uid() is not null
	and public.is_open_session_participant_profile(id)
);
