-- Phase 3 v1: sessions (create, list, observe, super-admin force-end)

create table public.sessions (
	id uuid primary key default gen_random_uuid(),
	club_id uuid not null references public.clubs (id) on delete cascade,
	host_id uuid not null references public.profiles (id) on delete restrict,
	name text not null,
	description text not null default '',
	status text not null default 'open' check (status in ('open', 'in_progress', 'closed', 'cancelled')),
	start_at timestamptz not null,
	end_at timestamptz not null,
	venue_name text,
	latitude double precision,
	longitude double precision,
	max_players int not null check (max_players > 0),
	min_players int not null check (min_players > 0),
	court_count int not null check (court_count > 0),
	court_fee_per_hour numeric(10, 2) not null check (court_fee_per_hour >= 0),
	shuttle_id uuid references public.club_shuttles (id) on delete set null,
	shuttle_price_per_each numeric(10, 2) not null check (shuttle_price_per_each >= 0),
	match_score_type smallint not null check (match_score_type in (15, 21)),
	match_type text not null check (match_type in ('one_round', 'two_round')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	check (min_players <= max_players),
	check (end_at > start_at),
	check (
		(latitude is null and longitude is null)
		or (latitude is not null and longitude is not null)
	)
);

create index sessions_club_id_idx on public.sessions (club_id);
create index sessions_start_at_idx on public.sessions (start_at);
create index sessions_status_idx on public.sessions (status);

create trigger sessions_updated_at
before update on public.sessions
for each row
execute function public.set_updated_at();

alter table public.sessions enable row level security;

create policy "Authenticated users can view sessions of active clubs"
on public.sessions
for select
using (
	auth.uid() is not null
	and (
		public.is_super_admin()
		or public.is_club_admin_of(club_id)
		or exists (
			select 1
			from public.clubs c
			where c.id = sessions.club_id
				and c.is_active = true
		)
	)
);

create policy "Club admins can create sessions"
on public.sessions
for insert
with check (public.is_super_admin() or public.is_club_admin_of(club_id));

create policy "Club admins can update sessions"
on public.sessions
for update
using (public.is_super_admin() or public.is_club_admin_of(club_id));

create policy "Super admins can delete sessions"
on public.sessions
for delete
using (public.is_super_admin());
