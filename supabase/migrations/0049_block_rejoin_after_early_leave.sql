-- Block rejoining a session after the player left early (status = left).

create or replace function public.join_session(p_session_id uuid)
returns public.session_players
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_session public.sessions;
	v_waiting_count int;
	v_queued_count int;
	v_new_status text;
	v_row public.session_players;
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

	if v_session.status not in ('open', 'in_progress') then
		raise exception 'Session is not open for joining';
	end if;

	if now() > v_session.end_at - interval '30 minutes' then
		raise exception 'Joining closed within 30 minutes of session end';
	end if;

	if exists (
		select 1
		from public.session_players
		where session_id = p_session_id
			and user_id = v_user_id
			and status in ('waiting', 'queued', 'confirmed')
	) then
		raise exception 'Already joined this session';
	end if;

	if exists (
		select 1
		from public.session_players
		where session_id = p_session_id
			and user_id = v_user_id
			and status = 'left'
	) then
		raise exception 'You left this session early and cannot rejoin';
	end if;

	if exists (
		select 1
		from public.session_players
		where user_id = v_user_id
			and fee_owed > 0
			and fee_status in ('owed', 'submitted')
	) then
		raise exception 'Outstanding cancellation fee must be settled before joining';
	end if;

	if exists (
		select 1
		from public.match_players mp
		join public.matches m on m.id = mp.match_id
		where mp.user_id = v_user_id
			and m.status in ('pending', 'active', 'score_pending', 'suspended')
	) then
		raise exception 'Finish your current match before joining another session';
	end if;

	if exists (
		select 1
		from public.session_players sp
		join public.sessions s on s.id = sp.session_id
		where sp.user_id = v_user_id
			and sp.status = 'confirmed'
			and s.status = 'in_progress'
			and sp.session_id <> p_session_id
			and v_session.start_at < s.end_at + interval '2 hours'
	) then
		raise exception 'While in a live session, only join sessions that start at least 2 hours after your current session ends';
	end if;

	if exists (
		select 1
		from public.session_players sp
		join public.sessions s on s.id = sp.session_id
		where sp.user_id = v_user_id
			and sp.status in ('waiting', 'queued', 'confirmed')
			and sp.session_id <> p_session_id
			and s.start_at < v_session.end_at
			and s.end_at > v_session.start_at
	) then
		raise exception 'Already joined another session at this time';
	end if;

	select count(*)::int
	into v_waiting_count
	from public.session_players
	where session_id = p_session_id
		and status in ('waiting', 'confirmed');

	if v_waiting_count < v_session.max_players then
		v_new_status := 'waiting';
	else
		select count(*)::int
		into v_queued_count
		from public.session_players
		where session_id = p_session_id
			and status = 'queued';

		if v_queued_count >= v_session.max_buffer then
			raise exception 'Session and buffer queue are full';
		end if;

		v_new_status := 'queued';
	end if;

	insert into public.session_players (session_id, user_id, status, activity, idle_since)
	values (
		p_session_id,
		v_user_id,
		v_new_status,
		'idle',
		case when v_new_status = 'confirmed' then now() else null end
	)
	returning * into v_row;

	return v_row;
end;
$$;
