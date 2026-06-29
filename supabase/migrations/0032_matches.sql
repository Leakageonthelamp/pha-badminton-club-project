-- Phase 4: matches, match_players, match_games + match control RPCs + shuttle billing

create table public.matches (
	id uuid primary key default gen_random_uuid(),
	session_id uuid not null references public.sessions (id) on delete cascade,
	court_number int not null check (court_number >= 1),
	status text not null default 'pending'
		check (status in ('pending', 'active', 'score_pending', 'suspended', 'completed', 'cancelled')),
	match_mode text not null default 'manual' check (match_mode in ('manual', 'auto')),
	round_type text not null check (round_type in ('one_round', 'two_round')),
	score_type smallint not null check (score_type in (15, 21)),
	shuttles_used int not null default 0 check (shuttles_used >= 0),
	invite_expires_at timestamptz,
	score_submitted_by uuid references public.profiles (id) on delete set null,
	created_by uuid references public.profiles (id) on delete set null,
	started_at timestamptz,
	ended_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index matches_session_id_idx on public.matches (session_id);
create index matches_status_idx on public.matches (status);

create unique index matches_one_live_per_court_idx
	on public.matches (session_id, court_number)
	where status in ('pending', 'active');

create trigger matches_updated_at
before update on public.matches
for each row
execute function public.set_updated_at();

create table public.match_players (
	id uuid primary key default gen_random_uuid(),
	match_id uuid not null references public.matches (id) on delete cascade,
	session_id uuid not null references public.sessions (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	team text not null check (team in ('A', 'B')),
	invite_status text not null default 'pending'
		check (invite_status in ('pending', 'accepted', 'rejected')),
	score_response text not null default 'pending'
		check (score_response in ('pending', 'accepted', 'rejected')),
	responded_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (match_id, user_id)
);

create index match_players_match_id_idx on public.match_players (match_id);
create index match_players_session_id_idx on public.match_players (session_id);
create index match_players_user_id_idx on public.match_players (user_id);

create trigger match_players_updated_at
before update on public.match_players
for each row
execute function public.set_updated_at();

create table public.match_games (
	id uuid primary key default gen_random_uuid(),
	match_id uuid not null references public.matches (id) on delete cascade,
	game_no smallint not null check (game_no in (1, 2)),
	team_a_score int not null check (team_a_score >= 0),
	team_b_score int not null check (team_b_score >= 0),
	created_at timestamptz not null default now(),
	unique (match_id, game_no)
);

create index match_games_match_id_idx on public.match_games (match_id);

alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.match_games enable row level security;

create policy "Session members can view matches"
on public.matches
for select
using (
	public.is_active_session_member(session_id)
	or public.is_super_admin()
	or exists (
		select 1
		from public.sessions s
		where s.id = matches.session_id
			and public.is_club_admin_of(s.club_id)
	)
);

create policy "Session members can view match players"
on public.match_players
for select
using (
	public.is_active_session_member(session_id)
	or public.is_super_admin()
	or exists (
		select 1
		from public.sessions s
		where s.id = match_players.session_id
			and public.is_club_admin_of(s.club_id)
	)
);

create policy "Session members can view match games"
on public.match_games
for select
using (
	exists (
		select 1
		from public.matches m
		where m.id = match_games.match_id
			and (
				public.is_active_session_member(m.session_id)
				or public.is_super_admin()
				or exists (
					select 1
					from public.sessions s
					where s.id = m.session_id
						and public.is_club_admin_of(s.club_id)
				)
			)
	)
);

-- ponytail: all writes go through RPCs; no insert/update policies

alter table public.matches replica identity full;
alter table public.match_players replica identity full;
alter table public.match_games replica identity full;

alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_players;
alter publication supabase_realtime add table public.match_games;

-- Internal helpers (no grant)

create or replace function public.is_user_in_open_match(p_user_id uuid, p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.match_players mp
		join public.matches m on m.id = mp.match_id
		where mp.user_id = p_user_id
			and mp.session_id = p_session_id
			and m.status in ('pending', 'active', 'score_pending', 'suspended')
	);
$$;

create or replace function public.set_match_players_playing(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	update public.session_players sp
	set activity = 'playing', idle_since = null, updated_at = now()
	from public.match_players mp
	where mp.match_id = p_match_id
		and sp.session_id = mp.session_id
		and sp.user_id = mp.user_id
		and sp.status = 'confirmed';
end;
$$;

create or replace function public.release_match_players_to_idle(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	update public.session_players sp
	set activity = 'idle', idle_since = now(), updated_at = now()
	from public.match_players mp
	where mp.match_id = p_match_id
		and sp.session_id = mp.session_id
		and sp.user_id = mp.user_id
		and sp.status = 'confirmed'
		and sp.activity = 'playing';
end;
$$;

create or replace function public.validate_match_games(
	p_round_type text,
	p_games jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_expected int;
	v_count int;
	v_game record;
begin
	v_expected := case when p_round_type = 'two_round' then 2 else 1 end;

	select count(*)::int into v_count
	from jsonb_array_elements(p_games) as g;

	if v_count <> v_expected then
		raise exception 'Expected % game(s) for this match type', v_expected;
	end if;

	for v_game in
		select *
		from jsonb_to_recordset(p_games) as x(game_no int, team_a_score int, team_b_score int)
	loop
		if v_game.game_no is null or v_game.team_a_score is null or v_game.team_b_score is null then
			raise exception 'Each game needs game_no and both scores';
		end if;

		if v_game.team_a_score = v_game.team_b_score then
			raise exception 'Game scores cannot be tied';
		end if;
	end loop;
end;
$$;

create or replace function public.upsert_match_games(p_match_id uuid, p_games jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_game record;
begin
	delete from public.match_games where match_id = p_match_id;

	for v_game in
		select *
		from jsonb_to_recordset(p_games) as x(game_no int, team_a_score int, team_b_score int)
	loop
		insert into public.match_games (match_id, game_no, team_a_score, team_b_score)
		values (p_match_id, v_game.game_no, v_game.team_a_score, v_game.team_b_score);
	end loop;
end;
$$;

create or replace function public.compute_session_player_shuttle_share(
	p_session_id uuid,
	p_user_id uuid
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_price numeric;
	v_share numeric;
begin
	select shuttle_price_per_each into v_price
	from public.sessions
	where id = p_session_id;

	if not found or v_price is null then
		return 0;
	end if;

	select coalesce(sum(
		(m.shuttles_used::numeric * v_price) / 4.0
	), 0)
	into v_share
	from public.match_players mp
	join public.matches m on m.id = mp.match_id
	where mp.session_id = p_session_id
		and mp.user_id = p_user_id
		and m.status = 'completed';

	return round(v_share, 2);
end;
$$;

create or replace function public.upsert_session_payment(
	p_session_id uuid,
	p_user_id uuid,
	p_court_share numeric,
	p_shuttle_share numeric default 0
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
	v_row public.payments;
	v_shuttle numeric := coalesce(p_shuttle_share, 0);
begin
	insert into public.payments (session_id, user_id, court_share, shuttle_share, total_amount, status)
	values (p_session_id, p_user_id, p_court_share, v_shuttle, p_court_share + v_shuttle, 'pending')
	on conflict (session_id, user_id) do update
	set
		court_share = excluded.court_share,
		shuttle_share = excluded.shuttle_share,
		total_amount = excluded.court_share + excluded.shuttle_share,
		status = case
			when public.payments.status = 'approved' then public.payments.status
			else 'pending'
		end,
		updated_at = now()
	returning * into v_row;

	return v_row;
end;
$$;

create or replace function public.create_match(
	p_session_id uuid,
	p_court_number int,
	p_user_ids uuid[]
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
	v_admin_id uuid := auth.uid();
	v_session public.sessions;
	v_match public.matches;
	v_user_id uuid;
	v_idx int := 0;
	v_team text;
begin
	if v_admin_id is null then
		raise exception 'Sign in required';
	end if;

	v_session := public.assert_session_club_admin(p_session_id);

	if v_session.status <> 'in_progress' then
		raise exception 'Session is not in progress';
	end if;

	if p_court_number < 1 or p_court_number > v_session.court_count then
		raise exception 'Invalid court number';
	end if;

	if p_user_ids is null or array_length(p_user_ids, 1) <> 4 then
		raise exception 'Select exactly 4 players';
	end if;

	if exists (
		select 1
		from public.matches
		where session_id = p_session_id
			and court_number = p_court_number
			and status in ('pending', 'active')
	) then
		raise exception 'Court already has a match';
	end if;

	foreach v_user_id in array p_user_ids loop
		if not exists (
			select 1
			from public.session_players sp
			where sp.session_id = p_session_id
				and sp.user_id = v_user_id
				and sp.status = 'confirmed'
				and sp.activity = 'idle'
		) then
			raise exception 'All selected players must be idle and confirmed';
		end if;

		if public.is_user_in_open_match(v_user_id, p_session_id) then
			raise exception 'A selected player is already in a match';
		end if;
	end loop;

	if (select count(distinct u) from unnest(p_user_ids) as u) <> 4 then
		raise exception 'Select 4 different players';
	end if;

	insert into public.matches (
		session_id,
		court_number,
		status,
		match_mode,
		round_type,
		score_type,
		invite_expires_at,
		created_by
	)
	values (
		p_session_id,
		p_court_number,
		'pending',
		'manual',
		v_session.match_type,
		v_session.match_score_type,
		now() + interval '30 seconds',
		v_admin_id
	)
	returning * into v_match;

	foreach v_user_id in array p_user_ids loop
		v_idx := v_idx + 1;
		v_team := case when v_idx <= 2 then 'A' else 'B' end;

		insert into public.match_players (match_id, session_id, user_id, team)
		values (v_match.id, p_session_id, v_user_id, v_team);
	end loop;

	return v_match;
end;
$$;

create or replace function public.respond_match_invite(p_match_id uuid, p_accept boolean)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_match public.matches;
	v_player public.match_players;
	v_pending int;
	v_accepted int;
begin
	if v_user_id is null then
		raise exception 'Sign in required';
	end if;

	select * into v_match
	from public.matches
	where id = p_match_id
	for update;

	if not found then
		raise exception 'Match not found';
	end if;

	if v_match.status <> 'pending' then
		raise exception 'Match invite is no longer pending';
	end if;

	if v_match.invite_expires_at is not null and now() > v_match.invite_expires_at then
		update public.matches
		set status = 'cancelled', ended_at = now(), updated_at = now()
		where id = p_match_id
		returning * into v_match;

		return v_match;
	end if;

	select * into v_player
	from public.match_players
	where match_id = p_match_id
		and user_id = v_user_id
	for update;

	if not found then
		raise exception 'You are not in this match';
	end if;

	if v_player.invite_status <> 'pending' then
		raise exception 'Invite already responded';
	end if;

	if not p_accept then
		update public.match_players
		set invite_status = 'rejected', responded_at = now(), updated_at = now()
		where id = v_player.id;

		update public.matches
		set status = 'cancelled', ended_at = now(), updated_at = now()
		where id = p_match_id
		returning * into v_match;

		return v_match;
	end if;

	update public.match_players
	set invite_status = 'accepted', responded_at = now(), updated_at = now()
	where id = v_player.id;

	select count(*)::int into v_pending
	from public.match_players
	where match_id = p_match_id
		and invite_status = 'pending';

	if v_pending > 0 then
		select * into v_match from public.matches where id = p_match_id;
		return v_match;
	end if;

	select count(*)::int into v_accepted
	from public.match_players
	where match_id = p_match_id
		and invite_status = 'accepted';

	if v_accepted = 4 then
		update public.matches
		set
			status = 'active',
			started_at = now(),
			shuttles_used = 1,
			updated_at = now()
		where id = p_match_id
		returning * into v_match;

		perform public.set_match_players_playing(p_match_id);
	else
		update public.matches
		set status = 'cancelled', ended_at = now(), updated_at = now()
		where id = p_match_id
		returning * into v_match;
	end if;

	return v_match;
end;
$$;

create or replace function public.expire_pending_matches(p_session_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	update public.matches
	set status = 'cancelled', ended_at = now(), updated_at = now()
	where status = 'pending'
		and invite_expires_at is not null
		and invite_expires_at < now()
		and (p_session_id is null or session_id = p_session_id);
end;
$$;

create or replace function public.add_match_shuttle(p_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
	v_match public.matches;
begin
	select * into v_match
	from public.matches
	where id = p_match_id
	for update;

	if not found then
		raise exception 'Match not found';
	end if;

	perform public.assert_session_club_admin(v_match.session_id);

	if v_match.status <> 'active' then
		raise exception 'Match is not active';
	end if;

	update public.matches
	set shuttles_used = shuttles_used + 1, updated_at = now()
	where id = p_match_id
	returning * into v_match;

	return v_match;
end;
$$;

create or replace function public.end_match_no_score(p_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
	v_match public.matches;
begin
	select * into v_match
	from public.matches
	where id = p_match_id
	for update;

	if not found then
		raise exception 'Match not found';
	end if;

	perform public.assert_session_club_admin(v_match.session_id);

	if v_match.status <> 'active' then
		raise exception 'Match is not active';
	end if;

	update public.matches
	set status = 'cancelled', ended_at = now(), shuttles_used = 0, updated_at = now()
	where id = p_match_id
	returning * into v_match;

	perform public.release_match_players_to_idle(p_match_id);

	return v_match;
end;
$$;

create or replace function public.end_match_with_score(p_match_id uuid, p_games jsonb)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
	v_match public.matches;
begin
	select * into v_match
	from public.matches
	where id = p_match_id
	for update;

	if not found then
		raise exception 'Match not found';
	end if;

	perform public.assert_session_club_admin(v_match.session_id);

	if v_match.status <> 'active' then
		raise exception 'Match is not active';
	end if;

	perform public.validate_match_games(v_match.round_type, p_games);
	perform public.upsert_match_games(p_match_id, p_games);

	update public.matches
	set status = 'completed', ended_at = now(), updated_at = now()
	where id = p_match_id
	returning * into v_match;

	perform public.release_match_players_to_idle(p_match_id);

	return v_match;
end;
$$;

create or replace function public.submit_match_score(p_match_id uuid, p_games jsonb)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_match public.matches;
	v_player public.match_players;
begin
	if v_user_id is null then
		raise exception 'Sign in required';
	end if;

	select * into v_match
	from public.matches
	where id = p_match_id
	for update;

	if not found then
		raise exception 'Match not found';
	end if;

	if v_match.status = 'score_pending' then
		raise exception 'Score already submitted';
	end if;

	if v_match.status <> 'active' then
		raise exception 'Match is not active';
	end if;

	select * into v_player
	from public.match_players
	where match_id = p_match_id
		and user_id = v_user_id;

	if not found then
		raise exception 'You are not in this match';
	end if;

	perform public.validate_match_games(v_match.round_type, p_games);
	perform public.upsert_match_games(p_match_id, p_games);

	update public.match_players
	set
		score_response = case when user_id = v_user_id then 'accepted' else 'pending' end,
		responded_at = case when user_id = v_user_id then now() else responded_at end,
		updated_at = now()
	where match_id = p_match_id;

	update public.matches
	set
		status = 'score_pending',
		score_submitted_by = v_user_id,
		updated_at = now()
	where id = p_match_id
	returning * into v_match;

	perform public.release_match_players_to_idle(p_match_id);

	return v_match;
end;
$$;

create or replace function public.respond_match_score(p_match_id uuid, p_accept boolean)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_match public.matches;
	v_player public.match_players;
	v_pending int;
	v_rejected int;
begin
	if v_user_id is null then
		raise exception 'Sign in required';
	end if;

	select * into v_match
	from public.matches
	where id = p_match_id
	for update;

	if not found then
		raise exception 'Match not found';
	end if;

	if v_match.status <> 'score_pending' then
		raise exception 'Match is not awaiting score confirmation';
	end if;

	select * into v_player
	from public.match_players
	where match_id = p_match_id
		and user_id = v_user_id
	for update;

	if not found then
		raise exception 'You are not in this match';
	end if;

	if v_player.user_id = v_match.score_submitted_by then
		select * into v_match from public.matches where id = p_match_id;
		return v_match;
	end if;

	if v_player.score_response <> 'pending' then
		raise exception 'Score already responded';
	end if;

	update public.match_players
	set
		score_response = case when p_accept then 'accepted' else 'rejected' end,
		responded_at = now(),
		updated_at = now()
	where id = v_player.id;

	if not p_accept then
		update public.matches
		set status = 'suspended', updated_at = now()
		where id = p_match_id
		returning * into v_match;

		return v_match;
	end if;

	select count(*)::int into v_pending
	from public.match_players
	where match_id = p_match_id
		and score_response = 'pending';

	select count(*)::int into v_rejected
	from public.match_players
	where match_id = p_match_id
		and score_response = 'rejected';

	if v_rejected > 0 then
		update public.matches
		set status = 'suspended', updated_at = now()
		where id = p_match_id
		returning * into v_match;

		return v_match;
	end if;

	if v_pending = 0 then
		update public.matches
		set status = 'completed', ended_at = now(), updated_at = now()
		where id = p_match_id
		returning * into v_match;
	else
		select * into v_match from public.matches where id = p_match_id;
	end if;

	return v_match;
end;
$$;

create or replace function public.resolve_match_score(p_match_id uuid, p_games jsonb)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
	v_match public.matches;
begin
	select * into v_match
	from public.matches
	where id = p_match_id
	for update;

	if not found then
		raise exception 'Match not found';
	end if;

	perform public.assert_session_club_admin(v_match.session_id);

	if v_match.status <> 'suspended' then
		raise exception 'Match is not suspended';
	end if;

	perform public.validate_match_games(v_match.round_type, p_games);
	perform public.upsert_match_games(p_match_id, p_games);

	update public.match_players
	set score_response = 'accepted', responded_at = now(), updated_at = now()
	where match_id = p_match_id;

	update public.matches
	set status = 'completed', ended_at = now(), updated_at = now()
	where id = p_match_id
	returning * into v_match;

	return v_match;
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
	v_shuttle_share numeric;
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
		v_shuttle_share := public.compute_session_player_shuttle_share(p_session_id, v_player.user_id);
		perform public.upsert_session_payment(p_session_id, v_player.user_id, v_court_share, v_shuttle_share);
	end loop;

	update public.session_players
	set activity = 'billing', idle_since = null, updated_at = now()
	where session_id = p_session_id
		and status = 'confirmed';
end;
$$;

create or replace function public.end_session_early(p_session_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
	v_session public.sessions;
	v_court_share numeric;
	v_shuttle_share numeric;
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
		v_shuttle_share := public.compute_session_player_shuttle_share(p_session_id, v_player.user_id);
		perform public.upsert_session_payment(p_session_id, v_player.user_id, v_court_share, v_shuttle_share);
	end loop;

	return v_session;
end;
$$;

grant execute on function public.create_match(uuid, int, uuid[]) to authenticated;
grant execute on function public.respond_match_invite(uuid, boolean) to authenticated;
grant execute on function public.expire_pending_matches(uuid) to authenticated;
grant execute on function public.add_match_shuttle(uuid) to authenticated;
grant execute on function public.end_match_no_score(uuid) to authenticated;
grant execute on function public.end_match_with_score(uuid, jsonb) to authenticated;
grant execute on function public.submit_match_score(uuid, jsonb) to authenticated;
grant execute on function public.respond_match_score(uuid, boolean) to authenticated;
grant execute on function public.resolve_match_score(uuid, jsonb) to authenticated;

-- Block break/leave while in an active or unresolved match
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

	if exists (
		select 1
		from public.match_players mp
		join public.matches m on m.id = mp.match_id
		where mp.user_id = v_user_id
			and mp.session_id = p_session_id
			and m.status in ('active', 'score_pending', 'suspended')
	) then
		raise exception 'Finish your current match first';
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
	v_shuttle_share numeric;
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

	if v_player.activity = 'playing' then
		raise exception 'Finish your current match first';
	end if;

	if exists (
		select 1
		from public.match_players mp
		join public.matches m on m.id = mp.match_id
		where mp.user_id = v_user_id
			and mp.session_id = p_session_id
			and m.status in ('active', 'score_pending', 'suspended')
	) then
		raise exception 'Finish your current match first';
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
	v_shuttle_share := public.compute_session_player_shuttle_share(p_session_id, v_user_id);
	perform public.upsert_session_payment(p_session_id, v_user_id, v_court_share, v_shuttle_share);

	insert into public.session_leave_requests (session_id, user_id, status)
	values (p_session_id, v_user_id, 'pending')
	returning * into v_row;

	update public.session_players
	set activity = 'billing', idle_since = null, updated_at = now()
	where id = v_player.id;

	return v_row;
end;
$$;

-- ponytail: pg_cron expire sweep when extension available
do $outer$
begin
	if exists (select 1 from pg_extension where extname = 'pg_cron') then
		perform cron.schedule(
			'expire-pending-matches',
			'* * * * *',
			'select public.expire_pending_matches()'
		);
	end if;
exception
	when others then
		null;
end;
$outer$;
