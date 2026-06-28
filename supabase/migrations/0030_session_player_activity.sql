-- Live session player activity (idle / playing / break / billing) + idle timer

alter table public.session_players
	add column activity text not null default 'idle'
		check (activity in ('idle', 'playing', 'break', 'billing')),
	add column idle_since timestamptz default now();

-- ponytail: roster-visible mirror of billing state; payments table stays source of truth for money
update public.session_players sp
set activity = 'idle', idle_since = now()
from public.sessions s
where sp.session_id = s.id
	and s.status = 'in_progress'
	and sp.status = 'confirmed';

create or replace function public.set_session_break(p_session_id uuid, p_break boolean)
returns public.session_players
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_session public.sessions;
	v_player public.session_players;
begin
	if v_user_id is null then
		raise exception 'Sign in required';
	end if;

	select * into v_session
	from public.sessions
	where id = p_session_id;

	if not found then
		raise exception 'Session not found';
	end if;

	if v_session.status <> 'in_progress' then
		raise exception 'Session is not in progress';
	end if;

	select * into v_player
	from public.session_players
	where session_id = p_session_id
		and user_id = v_user_id
		and status = 'confirmed'
	for update;

	if not found then
		raise exception 'Confirmed membership required';
	end if;

	if v_player.activity not in ('idle', 'break') then
		raise exception 'Cannot change break while billing or playing';
	end if;

	if p_break then
		if v_player.activity = 'break' then
			raise exception 'Already on break';
		end if;

		update public.session_players
		set activity = 'break', idle_since = null, updated_at = now()
		where id = v_player.id
		returning * into v_player;
	else
		if v_player.activity <> 'break' then
			raise exception 'Not on break';
		end if;

		update public.session_players
		set activity = 'idle', idle_since = now(), updated_at = now()
		where id = v_player.id
		returning * into v_player;
	end if;

	return v_player;
end;
$$;

create or replace function public.request_session_leave(p_session_id uuid)
returns public.session_leave_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_session public.sessions;
	v_player public.session_players;
	v_court_share numeric;
	v_row public.session_leave_requests;
begin
	if v_user_id is null then
		raise exception 'Sign in required';
	end if;

	select * into v_session
	from public.sessions
	where id = p_session_id
	for update;

	if not found then
		raise exception 'Session not found';
	end if;

	if v_session.status <> 'in_progress' then
		raise exception 'Session is not in progress';
	end if;

	select * into v_player
	from public.session_players
	where session_id = p_session_id
		and user_id = v_user_id
		and status = 'confirmed'
	for update;

	if not found then
		raise exception 'Confirmed membership required';
	end if;

	if exists (
		select 1
		from public.session_leave_requests
		where session_id = p_session_id
			and user_id = v_user_id
			and status = 'pending'
	) then
		raise exception 'Leave request already pending';
	end if;

	v_court_share := public.compute_session_court_share(p_session_id);
	perform public.upsert_session_payment(p_session_id, v_user_id, v_court_share);

	insert into public.session_leave_requests (session_id, user_id, status)
	values (p_session_id, v_user_id, 'pending')
	returning * into v_row;

	update public.session_players
	set activity = 'billing', idle_since = null, updated_at = now()
	where id = v_player.id;

	return v_row;
end;
$$;

create or replace function public.cancel_session_leave(p_session_id uuid)
returns public.session_leave_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_row public.session_leave_requests;
begin
	if v_user_id is null then
		raise exception 'Sign in required';
	end if;

	update public.session_leave_requests
	set status = 'cancelled', updated_at = now()
	where session_id = p_session_id
		and user_id = v_user_id
		and status = 'pending'
	returning * into v_row;

	if not found then
		raise exception 'No pending leave request';
	end if;

	delete from public.payments
	where session_id = p_session_id
		and user_id = v_user_id
		and status = 'pending';

	update public.session_players
	set activity = 'idle', idle_since = now(), updated_at = now()
	where session_id = p_session_id
		and user_id = v_user_id
		and status = 'confirmed';

	return v_row;
end;
$$;

create or replace function public.begin_session_settlement(p_session_id uuid)
returns void
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

	v_court_share := public.compute_session_court_share(p_session_id);

	for v_player in
		select user_id
		from public.session_players
		where session_id = p_session_id
			and status = 'confirmed'
	loop
		perform public.upsert_session_payment(p_session_id, v_player.user_id, v_court_share);
	end loop;

	update public.session_players
	set activity = 'billing', idle_since = null, updated_at = now()
	where session_id = p_session_id
		and status = 'confirmed';
end;
$$;

grant execute on function public.set_session_break(uuid, boolean) to authenticated;
