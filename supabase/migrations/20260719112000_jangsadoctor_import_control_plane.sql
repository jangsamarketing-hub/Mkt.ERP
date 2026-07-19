-- Stage 2A / Jangsadoctor import control plane.
-- Additive schema only. No existing store, Place, or detailed card rows change.

create table if not exists public.store_external_links (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  source_system text not null,
  source_company_id text not null,
  company_encoded_id text,
  source_url_redacted text,
  first_linked_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_external_links_source_check check (source_system in ('jangsadoctor_erp')),
  constraint store_external_links_company_id_check check (length(btrim(source_company_id)) > 0),
  unique (source_system, source_company_id),
  unique (store_id, source_system)
);

create table if not exists public.erp_import_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  store_id uuid references public.erp_stores(id) on delete set null,
  source_system text not null,
  schema_version text not null,
  snapshot_type text not null,
  idempotency_key uuid not null,
  mode text not null check (mode in ('preview', 'commit')),
  status text not null check (status in ('preview_ready', 'committed', 'rejected', 'quarantined', 'failed')),
  source_company_id text,
  snapshot_hash text,
  requested_by text,
  approved_by text,
  summary_json jsonb not null default '{}'::jsonb,
  error_json jsonb not null default '[]'::jsonb,
  commit_token_hash text,
  commit_token_expires_at timestamptz,
  committed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_import_runs_source_check check (source_system in ('jangsadoctor_erp')),
  constraint erp_import_runs_snapshot_type_check check (snapshot_type in ('initial_snapshot', 'incremental_snapshot')),
  unique (source_system, idempotency_key)
);

create table if not exists public.erp_source_snapshots (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  import_run_id uuid not null references public.erp_import_runs(id) on delete cascade,
  source_system text not null,
  snapshot_type text not null,
  snapshot_hash text not null,
  payload_redacted jsonb not null,
  captured_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint erp_source_snapshots_source_check check (source_system in ('jangsadoctor_erp')),
  unique (store_id, source_system, snapshot_hash)
);

create table if not exists public.erp_jangsadoctor_sales_imports (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  import_run_id uuid not null references public.erp_import_runs(id) on delete cascade,
  period_start date,
  period_end date,
  source_row_count integer not null default 0,
  accepted_row_count integer not null default 0,
  rejected_row_count integer not null default 0,
  source_total_amount bigint,
  accepted_total_amount bigint,
  source_total_count bigint,
  accepted_total_count bigint,
  validation_status text not null check (validation_status in ('ready', 'quarantined', 'committed')),
  created_at timestamptz not null default now(),
  unique (import_run_id)
);

create table if not exists public.erp_jangsadoctor_sales_daily (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  sales_import_id uuid not null references public.erp_jangsadoctor_sales_imports(id) on delete cascade,
  business_date date not null,
  total_amount bigint,
  transaction_count bigint,
  source_row_hash text not null,
  quality_flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_jangsadoctor_sales_daily_nonnegative_count check (transaction_count is null or transaction_count >= 0),
  unique (store_id, business_date),
  unique (store_id, source_row_hash)
);

create table if not exists public.erp_sync_cursors (
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  source_system text not null,
  dataset text not null,
  last_successful_date date,
  last_attempted_at timestamptz,
  last_status text,
  updated_at timestamptz not null default now(),
  primary key (store_id, source_system, dataset),
  constraint erp_sync_cursors_source_check check (source_system in ('jangsadoctor_erp'))
);

create table if not exists public.erp_import_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  store_id uuid references public.erp_stores(id) on delete set null,
  import_run_id uuid references public.erp_import_runs(id) on delete set null,
  actor text,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_redacted jsonb,
  after_redacted jsonb,
  created_at timestamptz not null default now()
);

create index if not exists store_external_links_store_idx on public.store_external_links (store_id, source_system);
create index if not exists erp_import_runs_store_created_idx on public.erp_import_runs (store_id, created_at desc);
create index if not exists erp_source_snapshots_store_captured_idx on public.erp_source_snapshots (store_id, captured_at desc);
create index if not exists erp_jangsadoctor_sales_daily_store_date_idx on public.erp_jangsadoctor_sales_daily (store_id, business_date desc);
create index if not exists erp_import_audit_logs_store_created_idx on public.erp_import_audit_logs (store_id, created_at desc);

drop trigger if exists store_external_links_set_updated_at on public.store_external_links;
create trigger store_external_links_set_updated_at before update on public.store_external_links
for each row execute function public.erp_set_updated_at();

drop trigger if exists erp_import_runs_set_updated_at on public.erp_import_runs;
create trigger erp_import_runs_set_updated_at before update on public.erp_import_runs
for each row execute function public.erp_set_updated_at();

drop trigger if exists erp_jangsadoctor_sales_daily_set_updated_at on public.erp_jangsadoctor_sales_daily;
create trigger erp_jangsadoctor_sales_daily_set_updated_at before update on public.erp_jangsadoctor_sales_daily
for each row execute function public.erp_set_updated_at();

drop trigger if exists erp_sync_cursors_set_updated_at on public.erp_sync_cursors;
create trigger erp_sync_cursors_set_updated_at before update on public.erp_sync_cursors
for each row execute function public.erp_set_updated_at();

alter table public.store_external_links enable row level security;
alter table public.erp_import_runs enable row level security;
alter table public.erp_source_snapshots enable row level security;
alter table public.erp_jangsadoctor_sales_imports enable row level security;
alter table public.erp_jangsadoctor_sales_daily enable row level security;
alter table public.erp_sync_cursors enable row level security;
alter table public.erp_import_audit_logs enable row level security;

revoke all on public.store_external_links from anon, authenticated;
revoke all on public.erp_import_runs from anon, authenticated;
revoke all on public.erp_source_snapshots from anon, authenticated;
revoke all on public.erp_jangsadoctor_sales_imports from anon, authenticated;
revoke all on public.erp_jangsadoctor_sales_daily from anon, authenticated;
revoke all on public.erp_sync_cursors from anon, authenticated;
revoke all on public.erp_import_audit_logs from anon, authenticated;
