-- Session cancellation audit: who cancelled and why

alter table public.sessions
	add column cancel_source text check (cancel_source in ('club_admin', 'super_admin', 'system')),
	add column cancel_reason text,
	add column cancelled_by uuid references public.profiles (id) on delete set null;

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

	update public.session_players sp
	set status = 'cancelled', fee_owed = 0, fee_status = 'none', updated_at = now()
	where sp.status in ('waiting', 'queued')
		and exists (
			select 1
			from public.session_players sp2
			join public.sessions s on s.id = sp2.session_id
			where sp2.user_id = sp.user_id
				and sp2.status = 'confirmed'
				and s.status = 'in_progress'
				and sp2.session_id <> sp.session_id
		);
end;
$$;
