-- Per-club cap on assignable club admins

alter table public.clubs
add column max_admins int not null default 3 check (max_admins > 0);
