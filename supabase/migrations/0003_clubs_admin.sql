-- Phase 2a: clubs, club_admins, super-admin RLS, role sync

create table public.clubs (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	description text not null default '',
	max_active_sessions int not null check (max_active_sessions > 0),
	owner_id uuid not null references public.profiles (id),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create trigger clubs_updated_at
before update on public.clubs
for each row
execute function public.set_updated_at();

create table public.club_admins (
	club_id uuid not null references public.clubs (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	assigned_by uuid references public.profiles (id),
	created_at timestamptz not null default now(),
	primary key (club_id, user_id)
);

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.profiles
		where id = auth.uid()
			and app_role = 'super_admin'
	);
$$;

create or replace function public.is_club_admin_of(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.club_admins
		where club_id = target_club_id
			and user_id = auth.uid()
	);
$$;

create or replace function public.sync_club_admin_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	target_user_id uuid;
	target_role text;
	remaining_clubs int;
begin
	if tg_op = 'INSERT' then
		target_user_id := new.user_id;
	elsif tg_op = 'DELETE' then
		target_user_id := old.user_id;
	else
		return coalesce(new, old);
	end if;

	select app_role into target_role
	from public.profiles
	where id = target_user_id;

	if target_role = 'super_admin' then
		return coalesce(new, old);
	end if;

	if tg_op = 'INSERT' and target_role = 'player' then
		update public.profiles
		set app_role = 'club_admin'
		where id = target_user_id;
	elsif tg_op = 'DELETE' and target_role = 'club_admin' then
		select count(*) into remaining_clubs
		from public.club_admins
		where user_id = target_user_id;

		if remaining_clubs = 0 then
			update public.profiles
			set app_role = 'player'
			where id = target_user_id;
		end if;
	end if;

	return coalesce(new, old);
end;
$$;

create trigger club_admins_sync_role
after insert or delete on public.club_admins
for each row
execute function public.sync_club_admin_role();

alter table public.clubs enable row level security;
alter table public.club_admins enable row level security;

create policy "Super admins can view all clubs"
on public.clubs
for select
using (public.is_super_admin());

create policy "Super admins can create clubs"
on public.clubs
for insert
with check (public.is_super_admin() and owner_id = auth.uid());

create policy "Super admins can update clubs"
on public.clubs
for update
using (public.is_super_admin());

create policy "Super admins can delete clubs"
on public.clubs
for delete
using (public.is_super_admin());

create policy "Super admins can view all club admins"
on public.club_admins
for select
using (public.is_super_admin());

create policy "Super admins can assign club admins"
on public.club_admins
for insert
with check (public.is_super_admin());

create policy "Super admins can remove club admins"
on public.club_admins
for delete
using (public.is_super_admin());

create policy "Super admins can view all profiles"
on public.profiles
for select
using (public.is_super_admin());
