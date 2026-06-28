-- Phase 3: player session join (waiting list, buffer queue, admin confirm/reject)

alter table public.sessions
	add column cancellation_fee numeric(10, 2) not null default 0 check (cancellation_fee >= 0),
	add column max_buffer int not null default 0 check (max_buffer >= 0);

create table public.session_players (
	id uuid primary key default gen_random_uuid(),
	session_id uuid not null references public.sessions (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	status text not null check (status in ('waiting', 'queued', 'confirmed', 'rejected', 'cancelled', 'left')),
	fee_owed numeric(10, 2) not null default 0 check (fee_owed >= 0),
	joined_at timestamptz not null default now(),
	decided_at timestamptz,
	left_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create unique index session_players_one_active_per_user_idx
	on public.session_players (session_id, user_id)
	where status in ('waiting', 'queued', 'confirmed');

create index session_players_session_id_idx on public.session_players (session_id);
create index session_players_user_id_idx on public.session_players (user_id);
create index session_players_status_idx on public.session_players (status);

create trigger session_players_updated_at
before update on public.session_players
for each row
execute function public.set_updated_at();

alter table public.session_players enable row level security;

create policy "Users can view own session memberships"
on public.session_players
for select
using (user_id = auth.uid());

create policy "Club admins can view session memberships"
on public.session_players
for select
using (
	public.is_super_admin()
	or exists (
		select 1
		from public.sessions s
		where s.id = session_players.session_id
			and public.is_club_admin_of(s.club_id)
	)
);

-- ponytail: all writes go through RPCs; no direct insert/update policies

create or replace function public.promote_queued_session_player(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_waiting_count int;
	v_max_players int;
	v_queued_id uuid;
begin
	select count(*)::int
	into v_waiting_count
	from public.session_players
	where session_id = p_session_id
		and status in ('waiting', 'confirmed');

	select max_players into v_max_players
	from public.sessions
	where id = p_session_id;

	if v_waiting_count >= v_max_players then
		return;
	end if;

	select id into v_queued_id
	from public.session_players
	where session_id = p_session_id
		and status = 'queued'
	order by joined_at asc
	limit 1
	for update skip locked;

	if v_queued_id is null then
		return;
	end if;

	update public.session_players
	set status = 'waiting'
	where id = v_queued_id;
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

	if v_session.end_at <= now() then
		raise exception 'Session has ended';
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
		set status = 'cancelled'
		where id = v_row.id
		returning * into v_row;
	else
		-- waiting: free cancel if more than 1 hour before start
		if now() < v_session.start_at - interval '1 hour' then
			update public.session_players
			set status = 'cancelled', fee_owed = 0
			where id = v_row.id
			returning * into v_row;
		else
			update public.session_players
			set status = 'cancelled', fee_owed = v_session.cancellation_fee
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

create or replace function public.confirm_session_player(p_player_id uuid)
returns public.session_players
language plpgsql
security definer
set search_path = public
as $$
declare
	v_row public.session_players;
	v_session public.sessions;
begin
	if auth.uid() is null then
		raise exception 'Sign in required';
	end if;

	select * into v_row
	from public.session_players
	where id = p_player_id
	for update;

	if not found then
		raise exception 'Player membership not found';
	end if;

	select * into v_session from public.sessions where id = v_row.session_id;

	if not (public.is_super_admin() or public.is_club_admin_of(v_session.club_id)) then
		raise exception 'Club admin access required';
	end if;

	if now() < v_session.start_at - interval '15 minutes' then
		raise exception 'Confirm/reject opens 15 minutes before session start';
	end if;

	if now() > v_session.end_at then
		raise exception 'Session has ended';
	end if;

	if v_row.status <> 'waiting' then
		raise exception 'Only waiting players can be confirmed';
	end if;

	update public.session_players
	set status = 'confirmed', decided_at = now()
	where id = p_player_id
	returning * into v_row;

	return v_row;
end;
$$;

create or replace function public.reject_session_player(p_player_id uuid)
returns public.session_players
language plpgsql
security definer
set search_path = public
as $$
declare
	v_row public.session_players;
	v_session public.sessions;
begin
	if auth.uid() is null then
		raise exception 'Sign in required';
	end if;

	select sp.*
	into v_row
	from public.session_players sp
	where sp.id = p_player_id
	for update;

	if not found then
		raise exception 'Player membership not found';
	end if;

	select * into v_session from public.sessions where id = v_row.session_id for update;

	if not (public.is_super_admin() or public.is_club_admin_of(v_session.club_id)) then
		raise exception 'Club admin access required';
	end if;

	if now() < v_session.start_at - interval '15 minutes' then
		raise exception 'Confirm/reject opens 15 minutes before session start';
	end if;

	if now() > v_session.end_at then
		raise exception 'Session has ended';
	end if;

	if v_row.status <> 'waiting' then
		raise exception 'Only waiting players can be rejected';
	end if;

	update public.session_players
	set status = 'rejected', decided_at = now()
	where id = p_player_id
	returning * into v_row;

	perform public.promote_queued_session_player(v_row.session_id);

	return v_row;
end;
$$;

create or replace function public.leave_session(p_session_id uuid)
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

	select * into v_row
	from public.session_players
	where session_id = p_session_id
		and user_id = v_user_id
		and status = 'confirmed'
	for update;

	if not found then
		raise exception 'No confirmed membership to leave';
	end if;

	-- ponytail: payment collection on leave is Phase 7; this only marks left
	update public.session_players
	set status = 'left', left_at = now()
	where id = v_row.id
	returning * into v_row;

	return v_row;
end;
$$;

grant execute on function public.join_session(uuid) to authenticated;
grant execute on function public.cancel_session_membership(uuid) to authenticated;
grant execute on function public.confirm_session_player(uuid) to authenticated;
grant execute on function public.reject_session_player(uuid) to authenticated;
grant execute on function public.leave_session(uuid) to authenticated;
