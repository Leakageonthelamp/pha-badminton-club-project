-- Invite window applies until the first accept; once someone accepts, keep the match
-- pending until all four accept or someone declines (no auto-cancel on timer).

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
		if exists (
			select 1
			from public.match_players
			where match_id = p_match_id
				and invite_status = 'accepted'
		) then
			update public.matches
			set invite_expires_at = null, updated_at = now()
			where id = p_match_id
			returning * into v_match;
		else
			update public.matches
			set status = 'cancelled', ended_at = now(), updated_at = now()
			where id = p_match_id
			returning * into v_match;

			return v_match;
		end if;
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
		update public.matches
		set invite_expires_at = null, updated_at = now()
		where id = p_match_id
		returning * into v_match;

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
	update public.matches m
	set status = 'cancelled', ended_at = now(), updated_at = now()
	where m.status = 'pending'
		and m.invite_expires_at is not null
		and m.invite_expires_at < now()
		and not exists (
			select 1
			from public.match_players mp
			where mp.match_id = m.id
				and mp.invite_status = 'accepted'
		)
		and (p_session_id is null or m.session_id = p_session_id);
end;
$$;

-- Clear stale invite timers on matches that already have acceptors.
update public.matches m
set invite_expires_at = null, updated_at = now()
where m.status = 'pending'
	and m.invite_expires_at is not null
	and exists (
		select 1
		from public.match_players mp
		where mp.match_id = m.id
			and mp.invite_status = 'accepted'
	);
