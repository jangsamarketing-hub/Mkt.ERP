-- Public client information forms are isolated from internal credentials
-- and private store-profile fields.

create table if not exists public.erp_store_information_submissions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'submitted',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint erp_store_information_submissions_status_check
    check (status in ('submitted', 'reviewed', 'archived')),
  constraint erp_store_information_submissions_answers_object_check
    check (jsonb_typeof(answers) = 'object')
);

create index if not exists erp_store_information_submissions_store_submitted_idx
  on public.erp_store_information_submissions (store_id, submitted_at desc);

alter table public.erp_store_information_submissions enable row level security;
revoke all on public.erp_store_information_submissions from anon, authenticated;

-- Public routes use the service role and accept only the allow-listed,
-- non-credential questionnaire fields in application code.
