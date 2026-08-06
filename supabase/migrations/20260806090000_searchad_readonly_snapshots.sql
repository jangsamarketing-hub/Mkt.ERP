-- Read-only Naver Search Ad ingestion. No credential is stored in this schema.
-- Each store is linked through store_external_identifiers.naver_searchad_customer_id.

create table if not exists public.erp_searchad_sync_configs (
  store_id uuid primary key references public.erp_stores(id) on delete cascade,
  enabled boolean not null default false,
  daily_sync_times time[] not null default array['06:10:00'::time],
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_searchad_sync_configs_timezone_check check (timezone = 'Asia/Seoul')
);

create table if not exists public.erp_searchad_sync_runs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  run_kind text not null,
  status text not null default 'running',
  requested_for_date date,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  constraint erp_searchad_sync_runs_kind_check check (run_kind in ('daily', 'manual')),
  constraint erp_searchad_sync_runs_status_check check (status in ('running', 'succeeded', 'failed', 'skipped'))
);

create index if not exists erp_searchad_sync_runs_store_started_idx
  on public.erp_searchad_sync_runs (store_id, started_at desc);

create table if not exists public.erp_searchad_account_snapshots (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  sync_run_id uuid references public.erp_searchad_sync_runs(id) on delete set null,
  captured_at timestamptz not null default now(),
  customer_id text not null,
  campaign_count integer not null default 0,
  active_campaign_count integer not null default 0,
  biz_money_balance numeric(16, 2),
  balance_status text not null default 'unavailable',
  raw_account jsonb not null default '{}'::jsonb,
  constraint erp_searchad_account_snapshots_balance_status_check
    check (balance_status in ('available', 'unavailable', 'failed'))
);

create index if not exists erp_searchad_account_snapshots_store_captured_idx
  on public.erp_searchad_account_snapshots (store_id, captured_at desc);

create table if not exists public.erp_searchad_campaign_daily_stats (
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  stat_date date not null,
  campaign_id text not null,
  campaign_name text,
  campaign_type text,
  campaign_status text,
  daily_budget numeric(16, 2),
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  ad_spend numeric(16, 2) not null default 0,
  ctr numeric(12, 6),
  average_cpc numeric(16, 2),
  average_rank numeric(12, 4),
  conversions bigint,
  raw_metrics jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  primary key (store_id, stat_date, campaign_id)
);

create index if not exists erp_searchad_campaign_daily_stats_store_date_idx
  on public.erp_searchad_campaign_daily_stats (store_id, stat_date desc);

alter table public.erp_searchad_sync_configs enable row level security;
alter table public.erp_searchad_sync_runs enable row level security;
alter table public.erp_searchad_account_snapshots enable row level security;
alter table public.erp_searchad_campaign_daily_stats enable row level security;

revoke all on public.erp_searchad_sync_configs from anon, authenticated;
revoke all on public.erp_searchad_sync_runs from anon, authenticated;
revoke all on public.erp_searchad_account_snapshots from anon, authenticated;
revoke all on public.erp_searchad_campaign_daily_stats from anon, authenticated;

drop trigger if exists erp_searchad_sync_configs_set_updated_at on public.erp_searchad_sync_configs;
create trigger erp_searchad_sync_configs_set_updated_at
before update on public.erp_searchad_sync_configs
for each row execute function public.erp_set_updated_at();
