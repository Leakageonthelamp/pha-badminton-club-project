-- Phase 3: auto-start open sessions at start_at; players can join in_progress until 30 min before end

create or replace function public.start_due_sessions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	update public.sessions
	set status = 'in_progress'
	where status = 'open'
		and start_at <= now();
end;
$$;

grant execute on function public.start_due_sessions() to authenticated;

-- ponytail: best-effort pg_cron; local dev without extension falls back to lazy sweep on page load
do $outer$
begin
	create extension if not exists pg_cron with schema extensions;

	perform cron.unschedule('start-due-sessions');

	perform cron.schedule(
		'start-due-sessions',
		'* * * * *',
		$cron$select public.start_due_sessions()$cron$
	);
exception
	when others then
		raise notice 'pg_cron not available; start_due_sessions will run via lazy sweep only (%)', sqlerrm;
end;
$outer$;

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
		where user_id = v_user_id
			and fee_owed > 0
	) then
		raise exception 'Outstanding cancellation fee must be settled before joining';
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

	insert into public.session_players (session_id, user_id, status)
	values (p_session_id, v_user_id, v_new_status)
	returning * into v_row;

	return v_row;
end;
$$;
