-- Club active flag; club_admins remains many-to-many (one user, many clubs)

alter table public.clubs
add column is_active boolean not null default true;

comment on table public.club_admins is
	'Membership rows: a user may admin multiple clubs (unique per club_id + user_id only).';
