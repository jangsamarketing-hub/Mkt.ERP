-- Stage 1C / expand phase only.
-- This migration adds the canonical organization and store boundary without
-- changing or replacing any existing erp_stores.id values.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_status_check check (status in ('active', 'paused', 'archived'))
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text,
  display_name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_status_check check (status in ('active', 'paused', 'archived'))
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, profile_id),
  constraint organization_members_role_check check (role in ('admin', 'manager', 'owner', 'store_staff'))
);

alter table public.erp_stores
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict,
  add column if not exists lifecycle_status text not null default 'active',
  add column if not exists environment text not null default 'production',
  add column if not exists management_start_date date,
  add column if not exists manager_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists archived_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'erp_stores_lifecycle_status_check') then
    alter table public.erp_stores
      add constraint erp_stores_lifecycle_status_check
      check (lifecycle_status in ('active', 'paused', 'archived'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'erp_stores_environment_check') then
    alter table public.erp_stores
      add constraint erp_stores_environment_check
      check (environment in ('production', 'sample', 'test'));
  end if;
end $$;

create table if not exists public.store_members (
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  primary key (store_id, profile_id),
  constraint store_members_role_check check (role in ('manager', 'owner', 'store_staff'))
);

create table if not exists public.store_external_identifiers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  identifier_type text not null,
  identifier_value text not null,
  label text,
  is_primary boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_external_identifiers_type_check check (
    identifier_type in (
      'naver_place_mid',
      'naver_place_id',
      'naver_searchad_customer_id',
      'credit_finance_merchant_group',
      'credit_finance_mid'
    )
  ),
  constraint store_external_identifiers_value_check check (length(btrim(identifier_value)) > 0),
  unique (store_id, identifier_type, identifier_value)
);

create unique index if not exists store_external_identifiers_primary_idx
  on public.store_external_identifiers (store_id, identifier_type)
  where is_primary;

create index if not exists erp_stores_organization_status_idx
  on public.erp_stores (organization_id, lifecycle_status, name);
create index if not exists store_members_profile_id_idx
  on public.store_members (profile_id, store_id);
create index if not exists store_external_identifiers_lookup_idx
  on public.store_external_identifiers (identifier_type, identifier_value);

create or replace function public.erp_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.erp_set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.erp_set_updated_at();

drop trigger if exists erp_stores_set_updated_at on public.erp_stores;
create trigger erp_stores_set_updated_at
before update on public.erp_stores
for each row execute function public.erp_set_updated_at();

drop trigger if exists store_external_identifiers_set_updated_at on public.store_external_identifiers;
create trigger store_external_identifiers_set_updated_at
before update on public.store_external_identifiers
for each row execute function public.erp_set_updated_at();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.store_members enable row level security;
alter table public.store_external_identifiers enable row level security;

-- The application currently accesses these tables only through authenticated
-- server routes using the service role. Browser roles receive no direct access.
revoke all on public.organizations from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.organization_members from anon, authenticated;
revoke all on public.store_members from anon, authenticated;
revoke all on public.store_external_identifiers from anon, authenticated;
