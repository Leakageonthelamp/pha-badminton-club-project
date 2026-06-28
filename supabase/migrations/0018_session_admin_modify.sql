-- Phase 3: admin edit/cancel releases active session players (no cancellation fee)

create or replace function public.release_active_session_players(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_session public.sessions;
begin
	if auth.uid() is null then
		raise exception 'Sign in required';
	end if;

	select * into v_session
	from public.sessions
	where id = p_session_id;

	if not found then
		raise exception 'Session not found';
	end if;

	if not (public.is_super_admin() or public.is_club_admin_of(v_session.club_id)) then
		raise exception 'Club admin access required';
	end if;

	update public.session_players
	set status = 'cancelled', fee_owed = 0
	where session_id = p_session_id
		and status in ('waiting', 'queued', 'confirmed');
end;
$$;

grant execute on function public.release_active_session_players(uuid) to authenticated;
