-- Record when a session actually ended (closed or cancelled), distinct from scheduled end_at.

alter table public.sessions
add column finished_at timestamptz;

update public.sessions
set finished_at = updated_at
where status in ('closed', 'cancelled')
	and finished_at is null;

create or replace function public.set_session_finished_at()
returns trigger
language plpgsql
as $$
begin
	if new.status in ('closed', 'cancelled')
		and old.status is distinct from new.status
		and new.finished_at is null then
		new.finished_at = now();
	end if;

	return new;
end;
$$;

create trigger sessions_finished_at
before update on public.sessions
for each row
execute function public.set_session_finished_at();
