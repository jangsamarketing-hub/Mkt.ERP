-- Store-scoped Naver Place JSON register. Raw files remain private; fact extraction follows after schema verification.
create table if not exists public.erp_naver_place_json_imports (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  file_name text not null,
  source_hash text not null,
  raw_storage_path text not null,
  schema_version text,
  source_store_name text,
  period_start date,
  period_end date,
  period_type text,
  module_coverage jsonb not null default '{}'::jsonb,
  quality jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  status text not null default 'ready' check (status in ('ready', 'needs_mapping', 'failed')),
  uploaded_at timestamptz not null default now(),
  constraint erp_naver_place_json_imports_period_check check (period_start is null or period_end is null or period_start <= period_end),
  unique (store_id, source_hash)
);

create index if not exists erp_naver_place_json_imports_store_period_idx
  on public.erp_naver_place_json_imports (store_id, period_start desc, period_end desc);

alter table public.erp_naver_place_json_imports enable row level security;
revoke all on public.erp_naver_place_json_imports from anon, authenticated;

update storage.buckets
set allowed_mime_types = array(select distinct unnest(coalesce(allowed_mime_types, '{}'::text[]) || array['application/json']))
where id = 'erp-private-uploads';
