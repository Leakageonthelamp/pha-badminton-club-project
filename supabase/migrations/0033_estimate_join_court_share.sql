-- Player join warning: per-player court share uses confirmed+left count; roster RLS hides counts from non-members.

create or replace function public.estimate_join_court_share(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_session public.sessions;
	v_court_total numeric;
	v_active_players int;
begin
	select * into v_session
	from public.sessions
	where id = p_session_id;

	if not found then
		return jsonb_build_object('share', 0, 'active_players', 0);
	end if;

	v_court_total :=
		v_session.court_fee_per_hour
		* (extract(epoch from (v_session.end_at - v_session.start_at)) / 3600.0)
		* v_session.court_count;

	select count(*)::int
	into v_active_players
	from public.session_players
	where session_id = p_session_id
		and status in ('confirmed', 'left');

	return jsonb_build_object(
		'share', round(v_court_total / greatest(v_active_players + 1, 1), 2),
		'active_players', v_active_players
	);
end;
$$;

grant execute on function public.estimate_join_court_share(uuid) to authenticated;
