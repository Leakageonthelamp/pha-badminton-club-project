-- Profile credentials: sign-in method preference, unique email, self-service email/phone for players

alter table public.profiles
	add column sign_in_method text not null default 'email';

alter table public.profiles
	add constraint profiles_sign_in_method_check
	check (sign_in_method in ('email', 'phone', 'google', 'facebook'));

create unique index profiles_email_key on public.profiles (email) where email is not null;

-- OAuth accounts first
update public.profiles p
set sign_in_method = sub.provider
from (
	select distinct on (user_id) user_id, provider
	from auth.identities
	where provider in ('google', 'facebook')
	order by user_id, created_at
) sub
where p.id = sub.user_id;

-- Phone-primary password accounts
update public.profiles p
set sign_in_method = 'phone'
from auth.users u
where u.id = p.id
	and u.email like '%@phone.ph-badminton.local'
	and p.sign_in_method not in ('google', 'facebook');

-- Remaining password accounts default to email
update public.profiles p
set sign_in_method = 'email'
from auth.users u
where u.id = p.id
	and u.email not like '%@phone.ph-badminton.local'
	and p.sign_in_method not in ('google', 'facebook', 'phone');

create or replace function public.lock_readonly_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	caller_role text;
begin
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
