-- Phase 1: profiles + auth triggers + avatar storage

create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	display_name text not null,
	avatar_url text,
	email text,
	phone text unique,
	app_role text not null default 'player' check (app_role in ('player', 'club_admin', 'super_admin')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	meta jsonb;
	display_name text;
	avatar_url text;
	phone text;
	profile_email text;
begin
	meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

	display_name := coalesce(
		meta ->> 'display_name',
		meta ->> 'full_name',
		meta ->> 'name',
		split_part(new.email, '@', 1)
	);

	avatar_url := coalesce(meta ->> 'avatar_url', meta ->> 'picture');
	phone := meta ->> 'phone';

	if new.email like '%@phone.ph-badminton.local' then
		profile_email := null;
	else
		profile_email := new.email;
	end if;

	insert into public.profiles (id, display_name, avatar_url, email, phone)
	values (new.id, display_name, avatar_url, profile_email, phone);

	return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

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

create trigger profiles_lock_readonly
before update on public.profiles
for each row
execute function public.lock_readonly_fields();

alter table public.profiles enable row level security;

create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible"
on storage.objects
for select
using (bucket_id = 'avatars');

create policy "Users can upload own avatar"
on storage.objects
for insert
with check (
	bucket_id = 'avatars'
	and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update own avatar"
on storage.objects
for update
using (
	bucket_id = 'avatars'
	and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete own avatar"
on storage.objects
for delete
using (
	bucket_id = 'avatars'
	and auth.uid()::text = (storage.foldername(name))[1]
);
