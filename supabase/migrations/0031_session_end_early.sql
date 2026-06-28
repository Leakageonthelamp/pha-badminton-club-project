-- Admin can end an in-progress session before scheduled end_at; bills everyone immediately.

alter table public.sessions
add column ended_early boolean not null default false;

create or replace function public.end_session_early(p_session_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
	v_session public.sessions;
	v_court_share numeric;
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
	set ended_early = true, updated_at = now()
	where id = p_session_id
	returning * into v_session;

	v_court_share := public.compute_session_court_share(p_session_id);

	for v_player in
		select user_id
		from public.session_players
		where session_id = p_session_id
			and status = 'confirmed'
	loop
		perform public.upsert_session_payment(p_session_id, v_player.user_id, v_court_share);
	end loop;

	return v_session;
end;
$$;

create or replace function public.close_session(p_session_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
	v_session public.sessions;
begin
	v_session := public.assert_session_club_admin(p_session_id);

	if v_session.status <> 'in_progress' then
		raise exception 'Session is not in progress';
	end if;

	if now() < v_session.end_at and not v_session.ended_early then
		raise exception 'Session has not reached end time';
	end if;

	if exists (
		select 1
		from public.session_players sp
		where sp.session_id = p_session_id
			and sp.fee_status in ('owed', 'submitted')
			and sp.fee_owed > 0
	) then
		raise exception 'All cancellation fees must be collected or waived before closing';
	end if;

	if exists (
		select 1
		from public.session_players sp
		where sp.session_id = p_session_id
			and sp.status = 'confirmed'
			and not exists (
				select 1
				from public.payments p
				where p.session_id = p_session_id
					and p.user_id = sp.user_id
					and p.status = 'approved'
			)
	) then
		raise exception 'All active players must have approved payments';
	end if;

	update public.session_players
	set status = 'left', left_at = now(), updated_at = now()
	where session_id = p_session_id
		and status = 'confirmed';

	update public.sessions
	set status = 'closed', updated_at = now()
	where id = p_session_id
	returning * into v_session;

	return v_session;
end;
$$;

grant execute on function public.end_session_early(uuid) to authenticated;
