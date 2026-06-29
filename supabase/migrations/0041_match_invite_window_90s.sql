-- Extend match invite window from 30s to 90s (1:30).

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
		now() + interval '90 seconds',
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
