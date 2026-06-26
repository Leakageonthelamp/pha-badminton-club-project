-- Phase 2b: club settings (PromptPay, location, shuttle inventory) + club_admin RLS

alter table public.clubs
	add column promptpay_type text check (promptpay_type in ('phone', 'national_id')),
	add column promptpay_target text,
	add column latitude double precision,
	add column longitude double precision;

create table public.club_shuttles (
	id uuid primary key default gen_random_uuid(),
	club_id uuid not null references public.clubs (id) on delete cascade,
	name text not null,
	speed smallint not null check (speed in (75, 76)),
	original_price numeric(10, 2) not null check (original_price >= 0),
	price numeric(10, 2) not null check (price >= 0),
	number_per_box int not null check (number_per_box > 0),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (club_id, name, speed)
);

create trigger club_shuttles_updated_at
before update on public.club_shuttles
for each row
execute function public.set_updated_at();

-- Reject club_admin updates to super-admin-only club columns
create or replace function public.guard_club_admin_club_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if public.is_super_admin() then
		return new;
	end if;

	if not public.is_club_admin_of(old.id) then
		return new;
	end if;

	if new.max_active_sessions is distinct from old.max_active_sessions
		or new.max_admins is distinct from old.max_admins
		or new.is_active is distinct from old.is_active
		or new.owner_id is distinct from old.owner_id then
		raise exception 'club_admin cannot modify restricted club fields';
	end if;

	return new;
end;
$$;

create trigger clubs_guard_club_admin_update
before update on public.clubs
for each row
execute function public.guard_club_admin_club_update();

alter table public.club_shuttles enable row level security;

create policy "Club admins can view their clubs"
on public.clubs
for select
using (public.is_club_admin_of(id));

create policy "Club admins can update their clubs"
on public.clubs
for update
using (public.is_club_admin_of(id));

create policy "Club admins can view club shuttles"
on public.club_shuttles
for select
using (public.is_super_admin() or public.is_club_admin_of(club_id));

create policy "Club admins can create club shuttles"
on public.club_shuttles
for insert
with check (public.is_super_admin() or public.is_club_admin_of(club_id));

create policy "Club admins can update club shuttles"
on public.club_shuttles
for update
using (public.is_super_admin() or public.is_club_admin_of(club_id));

create policy "Club admins can delete club shuttles"
on public.club_shuttles
for delete
using (public.is_super_admin() or public.is_club_admin_of(club_id));
