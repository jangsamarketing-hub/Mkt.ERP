-- Stage 1C: private store details for internal admin/manager work.
-- No existing erp_stores data is changed. Browser roles have no direct access.

create table if not exists public.erp_store_private_profiles (
  store_id uuid primary key references public.erp_stores(id) on delete cascade,
  owner_phone text,
  business_registration_number text,
  special_notes text,
  business_registration_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_store_private_profiles_owner_phone_length_check
    check (owner_phone is null or char_length(owner_phone) <= 40),
  constraint erp_store_private_profiles_business_number_length_check
    check (business_registration_number is null or char_length(business_registration_number) <= 40),
  constraint erp_store_private_profiles_notes_length_check
    check (special_notes is null or char_length(special_notes) <= 10000)
);

create index if not exists erp_store_private_profiles_updated_at_idx
  on public.erp_store_private_profiles (updated_at desc);

drop trigger if exists erp_store_private_profiles_set_updated_at on public.erp_store_private_profiles;
create trigger erp_store_private_profiles_set_updated_at
before update on public.erp_store_private_profiles
for each row execute function public.erp_set_updated_at();

alter table public.erp_store_private_profiles enable row level security;
revoke all on public.erp_store_private_profiles from anon, authenticated;

-- The existing erp-private-uploads bucket remains private. Business-registration
-- files are written only by server routes using the service role.
