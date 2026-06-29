-- Rally-point game score validation (mirrors @repo/ui/matches validateRallyGameScore).

create or replace function public.validate_rally_game_score(
	p_team_a int,
	p_team_b int,
	p_score_type smallint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_winner int;
	v_loser int;
	v_deuce_line int;
begin
	if p_team_a is null or p_team_b is null then
		raise exception 'Each game needs both scores';
	end if;

	if p_team_a < 0 or p_team_b < 0 then
		raise exception 'Scores cannot be negative';
	end if;

	if p_team_a = p_team_b then
		raise exception 'Game scores cannot be tied';
	end if;

	v_winner := greatest(p_team_a, p_team_b);
	v_loser := least(p_team_a, p_team_b);
	v_deuce_line := p_score_type - 1;

	if v_winner = p_score_type and v_loser < v_deuce_line then
		return;
	end if;

	if v_loser >= v_deuce_line and v_winner - v_loser = 2 then
		return;
	end if;

	raise exception 'Invalid score for a % point game', p_score_type;
end;
$$;

drop function if exists public.validate_match_games(text, jsonb);

create or replace function public.validate_match_games(
	p_round_type text,
	p_games jsonb,
	p_score_type smallint
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

		perform public.validate_rally_game_score(
			v_game.team_a_score,
			v_game.team_b_score,
			p_score_type
		);
	end loop;
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

	perform public.validate_match_games(v_match.round_type, p_games, v_match.score_type);
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

	perform public.validate_match_games(v_match.round_type, p_games, v_match.score_type);
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

	perform public.validate_match_games(v_match.round_type, p_games, v_match.score_type);
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
