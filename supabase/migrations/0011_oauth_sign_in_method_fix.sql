-- 0010 dropped the service_role bypass from lock_readonly_fields, so ensureOAuthSignInMethod
-- could not set sign_in_method to google/facebook for new OAuth users.
--
-- Backfill runs with the trigger disabled: db push does not use auth.role() = service_role,
-- so the trigger would reject google/facebook even after the function fix.

alter table public.profiles disable trigger profiles_lock_readonly;

update public.profiles p
set sign_in_method = sub.provider
from (
	select distinct on (user_id) user_id, provider
	from auth.identities
	where provider in ('google', 'facebook')
	order by user_id, created_at
) sub
where p.id = sub.user_id
	and p.sign_in_method not in ('google', 'facebook');

alter table public.profiles enable trigger profiles_lock_readonly;

create or replace function public.lock_readonly_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	caller_role text;
begin
	if coalesce(auth.role(), '') = 'service_role' then
		return new;
	end if;

	select app_role into caller_role from public.profiles where id = auth.uid();

	if caller_role in ('club_admin', 'super_admin') then
		return new;
	end if;

	if new.sign_in_method is distinct from old.sign_in_method then
		if old.sign_in_method in ('google', 'facebook') then
			raise exception 'sign_in_method cannot be changed for oauth accounts';
		end if;

		if new.sign_in_method not in ('email', 'phone') then
			raise exception 'invalid sign_in_method';
		end if;
	end if;

	if new.app_role is distinct from old.app_role then
		raise exception 'app_role cannot be changed without admin';
	end if;

	return new;
end;
$$;
