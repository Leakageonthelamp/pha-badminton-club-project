-- Payment slip attachments: private storage bucket + slip_path columns on payments / session_players.

insert into storage.buckets (id, name, public)
values ('payment-slips', 'payment-slips', false)
on conflict (id) do nothing;

create policy "Users can upload own payment slips"
on storage.objects
for insert
with check (
	bucket_id = 'payment-slips'
	and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update own payment slips"
on storage.objects
for update
using (
	bucket_id = 'payment-slips'
	and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete own payment slips"
on storage.objects
for delete
using (
	bucket_id = 'payment-slips'
	and auth.uid()::text = (storage.foldername(name))[1]
);

alter table public.payments
	add column if not exists slip_path text;

alter table public.session_players
	add column if not exists fee_slip_path text;

create or replace function public.submit_payment(p_session_id uuid, p_slip_path text default null)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_row public.payments;
begin
	if v_user_id is null then
		raise exception 'Sign in required';
	end if;

	if coalesce(btrim(p_slip_path), '') = '' then
		raise exception 'Attach your bank slip before submitting';
	end if;

	update public.payments
	set
		status = 'submitted',
		slip_path = p_slip_path,
		updated_at = now()
	where session_id = p_session_id
		and user_id = v_user_id
		and status = 'pending'
	returning * into v_row;

	if not found then
		raise exception 'No pending payment to submit';
	end if;

	return v_row;
end;
$$;

create or replace function public.submit_cancellation_fee(p_player_id uuid, p_slip_path text default null)
returns public.session_players
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_row public.session_players;
begin
	if v_user_id is null then
		raise exception 'Sign in required';
	end if;

	if coalesce(btrim(p_slip_path), '') = '' then
		raise exception 'Attach your bank slip before submitting';
	end if;

	update public.session_players
	set
		fee_status = 'submitted',
		fee_slip_path = p_slip_path,
		updated_at = now()
	where id = p_player_id
		and user_id = v_user_id
		and fee_status = 'owed'
		and fee_owed > 0
	returning * into v_row;

	if not found then
		raise exception 'No outstanding cancellation fee to submit';
	end if;

	return v_row;
end;
$$;

grant execute on function public.submit_payment(uuid, text) to authenticated;
grant execute on function public.submit_cancellation_fee(uuid, text) to authenticated;
