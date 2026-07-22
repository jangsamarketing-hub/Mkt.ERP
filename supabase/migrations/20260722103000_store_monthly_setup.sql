-- Stage 1C: store-specific, operator-managed monthly setup checklist.
-- New tables only; existing browser-local checklist data remains untouched.

create table if not exists public.erp_store_setup_months (
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  month_start date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (store_id, month_start),
  constraint erp_store_setup_months_month_start_check
    check (month_start = date_trunc('month', month_start)::date)
);

create table if not exists public.erp_store_setup_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  month_start date not null,
  label text not null,
  progress_percent integer not null default 0,
  due_date date,
  completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_store_setup_items_month_fk
    foreign key (store_id, month_start)
    references public.erp_store_setup_months(store_id, month_start)
    on delete cascade,
  constraint erp_store_setup_items_label_check check (char_length(btrim(label)) between 1 and 200),
  constraint erp_store_setup_items_progress_check check (progress_percent between 0 and 100)
);

create index if not exists erp_store_setup_items_store_month_idx
  on public.erp_store_setup_items (store_id, month_start, sort_order);

drop trigger if exists erp_store_setup_months_set_updated_at on public.erp_store_setup_months;
create trigger erp_store_setup_months_set_updated_at
before update on public.erp_store_setup_months
for each row execute function public.erp_set_updated_at();

drop trigger if exists erp_store_setup_items_set_updated_at on public.erp_store_setup_items;
create trigger erp_store_setup_items_set_updated_at
before update on public.erp_store_setup_items
for each row execute function public.erp_set_updated_at();

alter table public.erp_store_setup_months enable row level security;
alter table public.erp_store_setup_items enable row level security;
revoke all on public.erp_store_setup_months from anon, authenticated;
revoke all on public.erp_store_setup_items from anon, authenticated;
