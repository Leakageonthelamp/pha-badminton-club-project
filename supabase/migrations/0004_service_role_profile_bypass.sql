-- Service-role profile updates (super-admin backdoor, server-side auth admin API).
-- auth.uid() is null for service role, so lock_readonly_fields previously blocked app_role changes.

create or replace function public.lock_readonly_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	caller_role text;
begin
	-- ponytail: service role = SUPABASE_SECRET_KEY on server only; same trust boundary as auth.admin.*
	if coalesce(auth.role(), '') = 'service_role' then
		return new;
	end if;

	select app_role into caller_role from public.profiles where id = auth.uid();

	if caller_role in ('club_admin', 'super_admin') then
		return new;
	end if;

	if new.phone is distinct from old.phone then
		raise exception 'phone cannot be changed without admin';
	end if;

	if new.email is distinct from old.email then
		raise exception 'email cannot be changed without admin';
	end if;

	if new.app_role is distinct from old.app_role then
		raise exception 'app_role cannot be changed without admin';
	end if;

	return new;
end;
$$;
