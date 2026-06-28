-- Phase 3: min-players gate before in_progress; auto-cancel underfilled sessions

create or replace function public.release_session_players_internal(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	update public.session_players
	set status = 'cancelled', fee_owed = 0
	where session_id = p_session_id
		and status in ('waiting', 'queued', 'confirmed');
end;
$$;

create or replace function public.start_due_sessions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_session_id uuid;
begin
	-- T-15min .. start: not enough waiting+confirmed roster → cancel early
	for v_session_id in
		select s.id
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
		set status = 'cancelled'
		where id = v_session_id;

		perform public.release_session_players_internal(v_session_id);
	end loop;

	-- At start_at: underfilled on confirmed players → cancel (not in_progress)
	for v_session_id in
		select s.id
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
		set status = 'cancelled'
		where id = v_session_id;

		perform public.release_session_players_internal(v_session_id);
	end loop;

	-- At start_at: enough confirmed players → in_progress
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
