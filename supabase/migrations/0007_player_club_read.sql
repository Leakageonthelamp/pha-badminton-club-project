-- Player read access to active clubs and their admin profiles

create policy "Authenticated users can view active clubs"
on public.clubs
for select
using (is_active = true and auth.uid() is not null);

create policy "Authenticated users can view admins of active clubs"
on public.club_admins
for select
using (
	auth.uid() is not null
	and exists (
		select 1
		from public.clubs c
		where c.id = club_admins.club_id
			and c.is_active = true
	)
);

create policy "Authenticated users can view club admin profiles"
on public.profiles
for select
using (
	auth.uid() is not null
	and exists (
		select 1
		from public.club_admins ca
		join public.clubs c on c.id = ca.club_id
		where ca.user_id = profiles.id
			and c.is_active = true
	)
);
