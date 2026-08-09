-- Stage: daily task command center
-- Draft only: apply after comparing this repository with the linked Supabase schema.
-- Purpose: preserve each 4-week management cycle and keep prior work evidence immutable.

create table if not exists public.erp_store_contract_cycles (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  cycle_number integer not null check (cycle_number >= 1),
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('active', 'renewed', 'expired', 'paused')),
  renewed_from_cycle_id uuid references public.erp_store_contract_cycles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_store_contract_cycles_date_range check (end_date = start_date + 27),
  constraint erp_store_contract_cycles_store_cycle_unique unique (store_id, cycle_number),
  constraint erp_store_contract_cycles_store_start_unique unique (store_id, start_date)
);

create index if not exists erp_store_contract_cycles_active_idx
  on public.erp_store_contract_cycles (store_id, status, start_date desc);

alter table public.erp_store_work_updates
  add column if not exists contract_cycle_id uuid
  references public.erp_store_contract_cycles(id) on delete set null;

create index if not exists erp_store_work_updates_cycle_date_idx
  on public.erp_store_work_updates (store_id, contract_cycle_id, task_date);

-- Existing generated work rows can be linked in a controlled backfill after the
-- first active cycle is created for each store. Do not auto-delete older rows.
