-- Early leavers (status = left) need read access to session matches for recap/history.
-- is_active_session_member only covers waiting/queued/confirmed.

create or replace function public.is_session_member(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.session_players
		where session_id = p_session_id
			and user_id = auth.uid()
			and status in ('waiting', 'queued', 'confirmed', 'left')
	);
$$;

grant execute on function public.is_session_member(uuid) to authenticated;

drop policy if exists "Session members can view matches" on public.matches;
create policy "Session members can view matches"
on public.matches
for select
using (
	public.is_session_member(session_id)
	or public.is_super_admin()
	or exists (
		select 1
		from public.sessions s
		where s.id = matches.session_id
			and public.is_club_admin_of(s.club_id)
	)
);

drop policy if exists "Session members can view match players" on public.match_players;
create policy "Session members can view match players"
on public.match_players
for select
using (
	public.is_session_member(session_id)
	or public.is_super_admin()
	or exists (
		select 1
		from public.sessions s
		where s.id = match_players.session_id
			and public.is_club_admin_of(s.club_id)
	)
);

drop policy if exists "Session members can view match games" on public.match_games;
create policy "Session members can view match games"
on public.match_games
for select
using (
	exists (
		select 1
		from public.matches m
		where m.id = match_games.match_id
			and (
				public.is_session_member(m.session_id)
				or public.is_super_admin()
				or exists (
					select 1
					from public.sessions s
					where s.id = m.session_id
						and public.is_club_admin_of(s.club_id)
				)
			)
	)
);
