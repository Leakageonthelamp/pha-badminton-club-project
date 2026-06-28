-- Session-level PromptPay snapshot (required for new sessions via app validation)

alter table public.sessions
	add column promptpay_type text check (promptpay_type in ('phone', 'national_id')),
	add column promptpay_target text;
