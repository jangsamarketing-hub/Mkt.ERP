create table if not exists public.erp_card_imports (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  file_name text not null,
  source_hash text not null,
  raw_storage_path text not null,
  period_start date not null,
  period_end date not null,
  parser_version text not null,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  raw_row_count integer not null default 0,
  normalized_row_count integer not null default 0,
  raw_amount_sum bigint,
  net_sales bigint,
  net_payment_count integer,
  amount_per_payment bigint,
  warnings jsonb not null default '[]'::jsonb,
  parse_error text,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, source_hash)
);

create table if not exists public.erp_card_transactions (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.erp_card_imports(id) on delete cascade,
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  transaction_uid text not null unique,
  source_row_number integer not null,
  transaction_type text not null check (transaction_type in ('approval', 'cancellation')),
  transaction_date date not null,
  transaction_time time not null,
  transaction_at timestamptz not null,
  card_issuer text not null,
  affiliate_name text,
  masked_card_display text,
  approval_number text not null,
  amount_signed bigint not null,
  amount_abs bigint not null check (amount_abs > 0),
  installment text,
  cancellation_match_status text not null check (cancellation_match_status in ('matched', 'unmatched', 'not_applicable')),
  matched_transaction_uid text,
  quality_flags jsonb not null default '[]'::jsonb,
  raw_row jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists erp_card_imports_store_period_idx
  on public.erp_card_imports (store_id, period_start desc, period_end desc);
create index if not exists erp_card_transactions_store_date_idx
  on public.erp_card_transactions (store_id, transaction_date desc);
create index if not exists erp_card_transactions_import_idx
  on public.erp_card_transactions (import_id);
create index if not exists erp_card_transactions_approval_idx
  on public.erp_card_transactions (store_id, approval_number, card_issuer, amount_abs);

alter table public.erp_card_imports enable row level security;
alter table public.erp_card_transactions enable row level security;

drop view if exists public.erp_card_daily_summary;
create view public.erp_card_daily_summary as
select
  store_id,
  transaction_date,
  sum(amount_signed)::bigint as net_sales,
  (
    count(*) filter (where transaction_type = 'approval')
    - count(*) filter (where transaction_type = 'cancellation')
  )::integer as net_payment_count,
  case
    when (
      count(*) filter (where transaction_type = 'approval')
      - count(*) filter (where transaction_type = 'cancellation')
    ) > 0
    then round(
      sum(amount_signed)::numeric /
      (
        count(*) filter (where transaction_type = 'approval')
        - count(*) filter (where transaction_type = 'cancellation')
      )
    )::bigint
    else null
  end as amount_per_payment
from public.erp_card_transactions
group by store_id, transaction_date;

comment on view public.erp_card_daily_summary is
  'Card slip metrics only. amount_per_payment is not a per-person customer spend metric.';
