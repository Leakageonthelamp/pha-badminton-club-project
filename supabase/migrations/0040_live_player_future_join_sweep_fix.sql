-- 0028 added a sweep that cancelled ALL waiting/queued memberships whenever the
-- player was confirmed in any in_progress session. That fought join_session (0038),
-- which allows non-overlapping future sessions. Join succeeded, then the lazy sweep
-- on the next page load immediately cancelled the new row.

create or replace function public.start_due_sessions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_session record;
begin
	for v_session in
		select s.id, s.min_players
		from public.sessions s
		where s.status = 'open'
			and now() >= s.start_at - interval '15 minutes'
			and now() < s.start_at
			and (
				select count(*)::int
				from public.session_players sp
				where sp.session_id = s.id
					and sp.status in ('waiting', 'confirmed')
			) < s.min_players
	loop
		update public.sessions
		set
			status = 'cancelled',
			cancel_source = 'system',
			cancel_reason = format(
				'Not enough waiting or confirmed players 15 minutes before start (minimum %s).',
				v_session.min_players
			),
			cancelled_by = null
		where id = v_session.id;

		perform public.release_session_players_internal(v_session.id);
	end loop;

	for v_session in
		select s.id, s.min_players
		from public.sessions s
		where s.status = 'open'
			and s.start_at <= now()
			and (
				select count(*)::int
				from public.session_players sp
				where sp.session_id = s.id
					and sp.status = 'confirmed'
			) < s.min_players
	loop
		update public.sessions
		set
			status = 'cancelled',
			cancel_source = 'system',
			cancel_reason = format(
				'Not enough confirmed players at start time (minimum %s).',
				v_session.min_players
			),
			cancelled_by = null
		where id = v_session.id;

		perform public.release_session_players_internal(v_session.id);
	end loop;

	update public.sessions s
	set status = 'in_progress'
	where s.status = 'open'
		and s.start_at <= now()
		and (
			select count(*)::int
			from public.session_players sp
			where sp.session_id = s.id
				and sp.status = 'confirmed'
		) >= s.min_players;
end;
$$;
