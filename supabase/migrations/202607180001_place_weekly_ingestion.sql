alter table public.erp_place_csv_uploads
  add column if not exists file_hash text,
  add column if not exists status text not null default 'ready',
  add column if not exists parser_version text not null default 'place-insight-v1',
  add column if not exists warnings jsonb not null default '[]'::jsonb,
  add column if not exists parse_error text,
  add column if not exists is_current boolean not null default true,
  add column if not exists replaced_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'erp_place_csv_uploads_status_check'
  ) then
    alter table public.erp_place_csv_uploads
      add constraint erp_place_csv_uploads_status_check
      check (status in ('processing', 'ready', 'failed'));
  end if;
end $$;

alter table public.erp_place_keyword_rows
  add column if not exists previous_count integer,
  add column if not exists diff_count integer,
  add column if not exists diff_rate numeric,
  add column if not exists purpose_class text;

alter table public.erp_place_channel_rows
  add column if not exists previous_count integer,
  add column if not exists diff_count integer,
  add column if not exists diff_rate numeric;

create table if not exists public.erp_place_time_rows (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.erp_place_csv_uploads(id) on delete cascade,
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  hour integer not null check (hour between 0 and 23),
  visit_count integer not null default 0,
  previous_count integer,
  diff_count integer,
  diff_rate numeric,
  period_start date not null,
  period_end date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.erp_place_weekday_rows (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.erp_place_csv_uploads(id) on delete cascade,
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  weekday text not null,
  visit_count integer not null default 0,
  previous_count integer,
  diff_count integer,
  diff_rate numeric,
  period_start date not null,
  period_end date not null,
  created_at timestamptz not null default now()
);

alter table public.erp_place_time_rows enable row level security;
alter table public.erp_place_weekday_rows enable row level security;

create unique index if not exists erp_place_uploads_exact_file_uq
  on public.erp_place_csv_uploads(store_id, period_start, period_end, file_hash)
  where file_hash is not null;

create unique index if not exists erp_place_uploads_current_period_uq
  on public.erp_place_csv_uploads(store_id, period_start, period_end)
  where is_current and status = 'ready';

create index if not exists erp_place_uploads_store_period_idx
  on public.erp_place_csv_uploads(store_id, period_start desc, period_end desc);
create index if not exists erp_place_keyword_rows_upload_idx on public.erp_place_keyword_rows(upload_id);
create index if not exists erp_place_channel_rows_upload_idx on public.erp_place_channel_rows(upload_id);
create index if not exists erp_place_time_rows_upload_idx on public.erp_place_time_rows(upload_id);
create index if not exists erp_place_weekday_rows_upload_idx on public.erp_place_weekday_rows(upload_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'erp-private-uploads',
  'erp-private-uploads',
  false,
  10485760,
  array['text/csv', 'text/plain', 'application/vnd.ms-excel']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
