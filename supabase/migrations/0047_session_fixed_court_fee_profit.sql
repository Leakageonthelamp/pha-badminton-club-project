-- Session profit: optional fixed court fee per player + snapshot shuttle cost for profit reporting.
--
-- Two ways a club profits from a session:
--   1. Court fee  — set fixed_court_fee_per_player above the real court cost ÷ players.
--   2. Shuttle    — charge shuttle_price_per_each above the club's real per-shuttle cost.
-- When fixed_court_fee_per_player is null the court fee stays pure cost-sharing (zero court profit).

alter table public.sessions
add column fixed_court_fee_per_player numeric(10, 2)
	check (fixed_court_fee_per_player is null or fixed_court_fee_per_player >= 0);

alter table public.sessions
add column shuttle_cost_per_each numeric(10, 2) not null default 0
	check (shuttle_cost_per_each >= 0);

-- Backfill the real per-shuttle cost snapshot from the club shuttle each session selected.
update public.sessions s
set shuttle_cost_per_each = round(cs.price / nullif(cs.number_per_box, 0), 2)
from public.club_shuttles cs
where s.shuttle_id = cs.id
	and cs.number_per_box > 0;

-- Court share: flat fixed fee per player when set, else even split of the real court cost.
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

	if v_session.fixed_court_fee_per_player is not null then
		return round(v_session.fixed_court_fee_per_player, 2);
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

-- Join estimate: with a fixed fee the joining player simply owes the flat fee.
create or replace function public.estimate_join_court_share(p_session_id uuid)
returns jsonb
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
		return jsonb_build_object('share', 0, 'active_players', 0);
	end if;

	select count(*)::int
	into v_active_players
	from public.session_players
	where session_id = p_session_id
		and status in ('confirmed', 'left');

	if v_session.fixed_court_fee_per_player is not null then
		return jsonb_build_object(
			'share', round(v_session.fixed_court_fee_per_player, 2),
			'active_players', v_active_players
		);
	end if;

	v_court_total :=
		v_session.court_fee_per_hour
		* (extract(epoch from (v_session.end_at - v_session.start_at)) / 3600.0)
		* v_session.court_count;

	return jsonb_build_object(
		'share', round(v_court_total / greatest(v_active_players + 1, 1), 2),
		'active_players', v_active_players
	);
end;
$$;
