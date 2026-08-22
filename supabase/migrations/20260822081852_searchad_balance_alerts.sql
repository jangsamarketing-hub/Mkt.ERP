-- Internal Naver SearchAd budget alert ledger.
-- This is intentionally server-only: no anon/authenticated grants or policies.

create table if not exists public.erp_searchad_balance_alerts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  snapshot_id uuid references public.erp_searchad_account_snapshots(id) on delete set null,
  threshold_won integer not null check (threshold_won in (50000, 100000)),
  balance_won numeric(16, 2) not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  notified_at timestamptz,
  notification_channel text,
  notification_error text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists erp_searchad_balance_alerts_open_threshold_idx
  on public.erp_searchad_balance_alerts (store_id, threshold_won)
  where status = 'open';

create index if not exists erp_searchad_balance_alerts_store_detected_idx
  on public.erp_searchad_balance_alerts (store_id, last_detected_at desc);

alter table public.erp_searchad_balance_alerts enable row level security;
revoke all on public.erp_searchad_balance_alerts from anon, authenticated;

drop trigger if exists erp_searchad_balance_alerts_set_updated_at on public.erp_searchad_balance_alerts;
create trigger erp_searchad_balance_alerts_set_updated_at
before update on public.erp_searchad_balance_alerts
for each row execute function public.erp_set_updated_at();
