-- Players can view shuttle inventory for active clubs

create policy "Authenticated users can view shuttles of active clubs"
on public.club_shuttles
for select
using (
	auth.uid() is not null
	and exists (
		select 1
		from public.clubs c
		where c.id = club_shuttles.club_id
			and c.is_active = true
	)
);
