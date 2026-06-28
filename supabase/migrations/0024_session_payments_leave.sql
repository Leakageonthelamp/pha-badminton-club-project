-- Phase 3 live session: payments, early leave, settlement + close

create table public.payments (
	id uuid primary key default gen_random_uuid(),
	session_id uuid not null references public.sessions (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	court_share numeric(10, 2) not null check (court_share >= 0),
	shuttle_share numeric(10, 2) not null default 0 check (shuttle_share >= 0),
	total_amount numeric(10, 2) not null check (total_amount >= 0),
	status text not null default 'pending' check (status in ('pending', 'submitted', 'approved')),
	decided_by uuid references public.profiles (id) on delete set null,
	decided_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (session_id, user_id)
);

create index payments_session_id_idx on public.payments (session_id);
create index payments_user_id_idx on public.payments (user_id);
create index payments_status_idx on public.payments (status);

create trigger payments_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

create table public.session_leave_requests (
	id uuid primary key default gen_random_uuid(),
	session_id uuid not null references public.sessions (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
	requested_at timestamptz not null default now(),
	decided_by uuid references public.profiles (id) on delete set null,
	decided_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create unique index session_leave_requests_one_pending_idx
	on public.session_leave_requests (session_id, user_id)
	where status = 'pending';

create index session_leave_requests_session_id_idx on public.session_leave_requests (session_id);

create trigger session_leave_requests_updated_at
before update on public.session_leave_requests
for each row
execute function public.set_updated_at();

alter table public.payments enable row level security;
alter table public.session_leave_requests enable row level security;

create policy "Users can view own payments"
on public.payments
for select
using (user_id = auth.uid());

create policy "Club admins can view session payments"
on public.payments
for select
using (
	public.is_super_admin()
	or exists (
		select 1
		from public.sessions s
		where s.id = payments.session_id
			and public.is_club_admin_of(s.club_id)
	)
);

create policy "Users can view own leave requests"
on public.session_leave_requests
for select
using (user_id = auth.uid());

create policy "Club admins can view session leave requests"
on public.session_leave_requests
for select
using (
	public.is_super_admin()
	or exists (
		select 1
		from public.sessions s
		where s.id = session_leave_requests.session_id
			and public.is_club_admin_of(s.club_id)
	)
);

-- ponytail: writes via RPCs only; no insert/update policies

alter table public.payments replica identity full;
alter table public.session_leave_requests replica identity full;

alter publication supabase_realtime add table public.payments;
alter publication supabase_realtime add table public.session_leave_requests;

create or replace function public.compute_session_court_share(p_session_id uuid)
returns numeric
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
		return 0;
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

	if v_active_players <= 0 then
		return 0;
	end if;

	return round(v_court_total / v_active_players, 2);
end;
$$;

create or replace function public.upsert_session_payment(
	p_session_id uuid,
	p_user_id uuid,
	p_court_share numeric
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
	v_row public.payments;
begin
	insert into public.payments (session_id, user_id, court_share, shuttle_share, total_amount, status)
	values (p_session_id, p_user_id, p_court_share, 0, p_court_share, 'pending')
	on conflict (session_id, user_id) do update
	set
		court_share = excluded.court_share,
		total_amount = excluded.court_share + public.payments.shuttle_share,
		status = case
			when public.payments.status = 'approved' then public.payments.status
			else 'pending'
		end,
		updated_at = now()
	returning * into v_row;

	return v_row;
end;
$$;

create or replace function public.assert_session_club_admin(p_session_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
	v_session public.sessions;
begin
	select * into v_session
	from public.sessions
	where id = p_session_id
	for update;

	if not found then
		raise exception 'Session not found';
	end if;

	if not (
		public.is_super_admin()
		or public.is_club_admin_of(v_session.club_id)
	) then
		raise exception 'Club admin access required';
	end if;

	return v_session;
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

	return v_row;
end;
$$;

create or replace function public.submit_payment(p_session_id uuid)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_row public.payments;
begin
	if v_user_id is null then
		raise exception 'Sign in required';
	end if;

	update public.payments
	set status = 'submitted', updated_at = now()
	where session_id = p_session_id
		and user_id = v_user_id
		and status = 'pending'
	returning * into v_row;

	if not found then
		raise exception 'No pending payment to submit';
	end if;

	return v_row;
end;
$$;

create or replace function public.approve_payment(p_payment_id uuid)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
	v_admin_id uuid := auth.uid();
	v_payment public.payments;
	v_session public.sessions;
begin
	if v_admin_id is null then
		raise exception 'Sign in required';
	end if;

	select * into v_payment
	from public.payments
	where id = p_payment_id
	for update;

	if not found then
		raise exception 'Payment not found';
	end if;

	v_session := public.assert_session_club_admin(v_payment.session_id);

	if v_payment.status not in ('pending', 'submitted') then
		raise exception 'Payment is not awaiting approval';
	end if;

	update public.payments
	set
		status = 'approved',
		decided_by = v_admin_id,
		decided_at = now(),
		updated_at = now()
	where id = p_payment_id
	returning * into v_payment;

	return v_payment;
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
end;
$$;

create or replace function public.approve_session_leave(p_request_id uuid)
returns public.session_leave_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	v_admin_id uuid := auth.uid();
	v_request public.session_leave_requests;
	v_payment public.payments;
begin
	if v_admin_id is null then
		raise exception 'Sign in required';
	end if;

	select * into v_request
	from public.session_leave_requests
	where id = p_request_id
	for update;

	if not found then
		raise exception 'Leave request not found';
	end if;

	if v_request.status <> 'pending' then
		raise exception 'Leave request is not pending';
	end if;

	perform public.assert_session_club_admin(v_request.session_id);

	select * into v_payment
	from public.payments
	where session_id = v_request.session_id
		and user_id = v_request.user_id;

	if not found or v_payment.status <> 'approved' then
		raise exception 'Player payment must be approved first';
	end if;

	update public.session_players
	set status = 'left', left_at = now(), updated_at = now()
	where session_id = v_request.session_id
		and user_id = v_request.user_id
		and status = 'confirmed';

	update public.session_leave_requests
	set
		status = 'approved',
		decided_by = v_admin_id,
		decided_at = now(),
		updated_at = now()
	where id = p_request_id
	returning * into v_request;

	return v_request;
end;
$$;

create or replace function public.reject_session_leave(p_request_id uuid)
returns public.session_leave_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	v_admin_id uuid := auth.uid();
	v_request public.session_leave_requests;
begin
	if v_admin_id is null then
		raise exception 'Sign in required';
	end if;

	select * into v_request
	from public.session_leave_requests
	where id = p_request_id
	for update;

	if not found then
		raise exception 'Leave request not found';
	end if;

	if v_request.status <> 'pending' then
		raise exception 'Leave request is not pending';
	end if;

	perform public.assert_session_club_admin(v_request.session_id);

	update public.session_leave_requests
	set
		status = 'rejected',
		decided_by = v_admin_id,
		decided_at = now(),
		updated_at = now()
	where id = p_request_id
	returning * into v_request;

	return v_request;
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

grant execute on function public.request_session_leave(uuid) to authenticated;
grant execute on function public.cancel_session_leave(uuid) to authenticated;
grant execute on function public.submit_payment(uuid) to authenticated;
grant execute on function public.approve_payment(uuid) to authenticated;
grant execute on function public.begin_session_settlement(uuid) to authenticated;
grant execute on function public.approve_session_leave(uuid) to authenticated;
grant execute on function public.reject_session_leave(uuid) to authenticated;
grant execute on function public.close_session(uuid) to authenticated;

-- Block join while confirmed in an in_progress session; auto-cancel other waitlists when session starts

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

create or replace function public.start_due_sessions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_session_id uuid;
begin
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

	-- ponytail: cancel other waitlists when player is confirmed in an in_progress session
	update public.session_players sp
	set status = 'cancelled', fee_owed = 0, updated_at = now()
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
