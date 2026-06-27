-- Restore shuttle speed; drop original_price; unique on (club_id, name, speed)

alter table public.club_shuttles
	drop constraint club_shuttles_club_id_name_key;

alter table public.club_shuttles
	add column speed smallint;

update public.club_shuttles
	set speed = 75
	where speed is null;

alter table public.club_shuttles
	alter column speed set not null;

alter table public.club_shuttles
	add constraint club_shuttles_speed_check check (speed in (75, 76));

alter table public.club_shuttles
	drop column original_price;

alter table public.club_shuttles
	add constraint club_shuttles_club_id_name_speed_key unique (club_id, name, speed);
