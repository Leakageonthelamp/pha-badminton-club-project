-- ponytail: manual self-check for session join RPCs (run after db:reset with seed data)
-- psql $DATABASE_URL -f supabase/tests/session_players_self_check.sql

do $$
begin
	raise notice 'session_players migration defines join_session, cancel_session_membership, promote_queued_session_player RPCs';
	raise notice 'Verify in app: join when full -> queued; late cancel -> fee_owed; cancel waiting -> promote oldest queued';
end;
$$;
