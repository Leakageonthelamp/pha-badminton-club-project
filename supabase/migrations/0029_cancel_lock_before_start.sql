-- Waiting-list players cannot self-cancel within 15 minutes of session start (admin confirm window).

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
		if now() >= v_session.start_at - interval '15 minutes' then
			raise exception 'Cannot cancel within 15 minutes of start. Ask the admin to reject you, or play and request an early leave.';
		end if;

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
