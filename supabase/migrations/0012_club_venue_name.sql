-- Club default venue name (prefills session venue)

alter table public.clubs
	add column venue_name text;
