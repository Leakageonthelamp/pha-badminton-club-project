-- Phase 3: session draft lifecycle (create as draft, admin opens before start-1hr)

alter table public.sessions drop constraint sessions_status_check;

alter table public.sessions
	add constraint sessions_status_check
	check (status in ('draft', 'open', 'in_progress', 'closed', 'cancelled'));

alter table public.sessions alter column status set default 'draft';
