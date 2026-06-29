-- Roster queries join profiles via session_players FK, but profiles RLS only allowed
-- own profile, super admins, and club-admin profiles. Fellow session players were hidden,
-- so active-player lists showed "Unknown player" for non-admin joiners.

create or replace function public.shares_session_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.session_players sp_viewer
		inner join public.session_players sp_target
			on sp_target.session_id = sp_viewer.session_id
		where sp_viewer.user_id = auth.uid()
			and sp_target.user_id = p_user_id
			and sp_viewer.status in ('waiting', 'queued', 'confirmed', 'left')
			and sp_target.status in ('waiting', 'queued', 'confirmed', 'left')
	);
$$;

create or replace function public.is_club_session_participant_profile(p_user_id uuid)
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
			and public.is_club_admin_of(s.club_id)
	);
$$;

grant execute on function public.shares_session_with(uuid) to authenticated;
grant execute on function public.is_club_session_participant_profile(uuid) to authenticated;

create policy "Session members can view fellow player profiles"
on public.profiles
for select
using (
	auth.uid() is not null
	and (
		public.shares_session_with(id)
		or public.is_club_session_participant_profile(id)
	)
);
