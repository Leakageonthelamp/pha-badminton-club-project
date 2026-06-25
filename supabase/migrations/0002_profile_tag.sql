-- Player tag: unique # + 4 alphanumeric chars (e.g. #1234, #sd23)

create or replace function public.generate_unique_tag()
returns text
language plpgsql
as $$
declare
	candidate text;
	chars constant text := 'abcdefghijklmnopqrstuvwxyz0123456789';
	i integer;
	attempt integer;
begin
	for attempt in 1..50 loop
		candidate := '#';
		for i in 1..4 loop
			candidate := candidate || substr(chars, 1 + floor(random() * length(chars))::integer, 1);
		end loop;

		exit when not exists (select 1 from public.profiles where tag = candidate);
	end loop;

	return candidate;
end;
$$;

alter table public.profiles
add column tag text;

alter table public.profiles
add constraint profiles_tag_format check (tag is null or tag ~ '^#[a-z0-9]{4}$');

create unique index profiles_tag_key on public.profiles (tag) where tag is not null;

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
	player_tag text;
	attempt integer;
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

	for attempt in 1..10 loop
		player_tag := public.generate_unique_tag();

		begin
			insert into public.profiles (id, display_name, avatar_url, email, phone, tag)
			values (new.id, display_name, avatar_url, profile_email, phone, player_tag);

			return new;
		exception
			when unique_violation then
				if attempt = 10 then
					raise;
				end if;
		end;
	end loop;

	return new;
end;
$$;

-- Backfill any existing rows missing a tag
update public.profiles
set tag = public.generate_unique_tag()
where tag is null;

alter table public.profiles
alter column tag set not null;
