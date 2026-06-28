-- Phase 7: cancellation fee payment lifecycle on session_players

alter table public.session_players
	add column fee_status text not null default 'none'
		check (fee_status in ('none', 'owed', 'submitted', 'paid', 'waived')),
	add column fee_paid_at timestamptz,
	add column fee_decided_by uuid references public.profiles (id) on delete set null;

update public.session_players
set fee_status = 'owed'
where fee_owed > 0;

create or replace function public.cancel_session_membership(p_session_id uuid)
returns public.session_players
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_session public.sessions;
	v_row public.session_players;
	v_was_waiting boolean;
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

	select * into v_row
	from public.session_players
	where session_id = p_session_id
		and user_id = v_user_id
		and status in ('waiting', 'queued')
	for update;

	if not found then
		raise exception 'No active waiting or queued membership to cancel';
	end if;

	v_was_waiting := v_row.status = 'waiting';

	if v_row.status = 'queued' then
		update public.session_players
		set status = 'cancelled', fee_status = 'none', fee_owed = 0
		where id = v_row.id
		returning * into v_row;
	else
		if now() < v_session.start_at - interval '1 hour' then
			update public.session_players
			set status = 'cancelled', fee_owed = 0, fee_status = 'none'
			where id = v_row.id
			returning * into v_row;
		else
			update public.session_players
			set
				status = 'cancelled',
				fee_owed = v_session.cancellation_fee,
				fee_status = case
					when v_session.cancellation_fee > 0 then 'owed'
					else 'none'
				end
			where id = v_row.id
			returning * into v_row;
		end if;
	end if;

	if v_was_waiting then
		perform public.promote_queued_session_player(p_session_id);
	end if;

	return v_row;
end;
$$;

create or replace function public.submit_cancellation_fee(p_player_id uuid)
returns public.session_players
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_row public.session_players;
begin
	if v_user_id is null then
		raise exception 'Sign in required';
	end if;

	update public.session_players
	set fee_status = 'submitted', updated_at = now()
	where id = p_player_id
		and user_id = v_user_id
		and fee_status = 'owed'
		and fee_owed > 0
	returning * into v_row;

	if not found then
		raise exception 'No outstanding cancellation fee to submit';
	end if;

	return v_row;
end;
$$;

create or replace function public.confirm_cancellation_fee(p_player_id uuid)
returns public.session_players
language plpgsql
security definer
set search_path = public
as $$
declare
	v_admin_id uuid := auth.uid();
	v_row public.session_players;
begin
	if v_admin_id is null then
		raise exception 'Sign in required';
	end if;

	select * into v_row
	from public.session_players
	where id = p_player_id
	for update;

	if not found then
		raise exception 'Session player not found';
	end if;

	perform public.assert_session_club_admin(v_row.session_id);

	if v_row.fee_status not in ('owed', 'submitted') or v_row.fee_owed <= 0 then
		raise exception 'Cancellation fee is not awaiting confirmation';
	end if;

	update public.session_players
	set
		fee_status = 'paid',
		fee_paid_at = now(),
		fee_decided_by = v_admin_id,
		updated_at = now()
	where id = p_player_id
	returning * into v_row;

	return v_row;
end;
$$;

create or replace function public.waive_cancellation_fee(p_player_id uuid)
returns public.session_players
language plpgsql
security definer
set search_path = public
as $$
declare
	v_admin_id uuid := auth.uid();
	v_row public.session_players;
begin
	if v_admin_id is null then
		raise exception 'Sign in required';
	end if;

	select * into v_row
	from public.session_players
	where id = p_player_id
	for update;

	if not found then
		raise exception 'Session player not found';
	end if;

	perform public.assert_session_club_admin(v_row.session_id);

	if v_row.fee_status not in ('owed', 'submitted') or v_row.fee_owed <= 0 then
		raise exception 'Cancellation fee is not outstanding';
	end if;

	update public.session_players
	set
		fee_status = 'waived',
		fee_decided_by = v_admin_id,
		fee_paid_at = now(),
		updated_at = now()
	where id = p_player_id
	returning * into v_row;

	return v_row;
end;
$$;

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
			and fee_status in ('owed', 'submitted')
	) then
		raise exception 'Outstanding cancellation fee must be settled before joining';
	end if;

	if exists (
		select 1
		from public.session_players sp
		join public.sessions s on s.id = sp.session_id
		where sp.user_id = v_user_id
			and sp.status = 'confirmed'
			and s.status = 'in_progress'
	) then
		raise exception 'Currently in an active session';
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

	if now() < v_session.end_at then
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

grant execute on function public.submit_cancellation_fee(uuid) to authenticated;
grant execute on function public.confirm_cancellation_fee(uuid) to authenticated;
grant execute on function public.waive_cancellation_fee(uuid) to authenticated;
