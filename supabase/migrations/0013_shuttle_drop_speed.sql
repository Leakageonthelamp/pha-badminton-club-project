-- Drop shuttle speed; one brand name per club

alter table public.club_shuttles
	drop constraint club_shuttles_club_id_name_speed_key;

alter table public.club_shuttles
	drop column speed;

alter table public.club_shuttles
	add constraint club_shuttles_club_id_name_key unique (club_id, name);
