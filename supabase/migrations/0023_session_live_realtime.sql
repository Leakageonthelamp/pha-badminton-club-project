-- Phase 3 live session: enable Supabase Realtime on existing session tables

alter table public.sessions replica identity full;
alter table public.session_players replica identity full;

alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.session_players;
