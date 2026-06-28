-- Phase 3: joined players can view waiting list / buffer queue / confirmed roster

create or replace function public.is_active_session_member(p_session_id uuid)
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
			and status in ('waiting', 'queued', 'confirmed')
	);
$$;

create policy "Joined players can view session roster"
on public.session_players
for select
using (public.is_active_session_member(session_id));

grant execute on function public.is_active_session_member(uuid) to authenticated;
