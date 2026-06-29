-- Distinguish admin settlement (begin_session_settlement / end_session_early) from per-player early-leave bills.

alter table public.sessions
add column settlement_started_at timestamptz;

create or replace function public.begin_session_settlement(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_session public.sessions;
	v_court_share numeric;
	v_shuttle_share numeric;
	v_player record;
begin
	v_session := public.assert_session_club_admin(p_session_id);

	if v_session.status <> 'in_progress' then
		raise exception 'Session is not in progress';
	end if;

	update public.sessions
	set settlement_started_at = coalesce(settlement_started_at, now()), updated_at = now()
	where id = p_session_id;

	v_court_share := public.compute_session_court_share(p_session_id);

	for v_player in
		select user_id
		from public.session_players
		where session_id = p_session_id
			and status = 'confirmed'
	loop
		v_shuttle_share := public.compute_session_player_shuttle_share(p_session_id, v_player.user_id);
		perform public.upsert_session_payment(p_session_id, v_player.user_id, v_court_share, v_shuttle_share);
	end loop;

	update public.session_players
	set activity = 'billing', idle_since = null, updated_at = now()
	where session_id = p_session_id
		and status = 'confirmed';
end;
$$;

create or replace function public.end_session_early(p_session_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
	v_session public.sessions;
	v_court_share numeric;
	v_shuttle_share numeric;
	v_player record;
begin
	v_session := public.assert_session_club_admin(p_session_id);

	if v_session.status <> 'in_progress' then
		raise exception 'Session is not in progress';
	end if;

	if v_session.ended_early then
		raise exception 'Session already ended early';
	end if;

	update public.sessions
	set
		ended_early = true,
		settlement_started_at = coalesce(settlement_started_at, now()),
		updated_at = now()
	where id = p_session_id
	returning * into v_session;

	v_court_share := public.compute_session_court_share(p_session_id);

	for v_player in
		select user_id
		from public.session_players
		where session_id = p_session_id
			and status = 'confirmed'
	loop
		v_shuttle_share := public.compute_session_player_shuttle_share(p_session_id, v_player.user_id);
		perform public.upsert_session_payment(p_session_id, v_player.user_id, v_court_share, v_shuttle_share);
	end loop;

	return v_session;
end;
$$;
