-- Internal credential vault. Secrets are encrypted by the application before they reach this table.
create table if not exists public.erp_store_external_credentials (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  credential_kind text not null check (credential_kind in ('naver_login', 'searchad_api')),
  username text,
  secret_ciphertext text not null,
  secret_last4 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, credential_kind)
);

alter table public.erp_store_external_credentials enable row level security;
revoke all on public.erp_store_external_credentials from anon, authenticated;
grant select, insert, update, delete on public.erp_store_external_credentials to service_role;

drop trigger if exists erp_store_external_credentials_set_updated_at on public.erp_store_external_credentials;
create trigger erp_store_external_credentials_set_updated_at
before update on public.erp_store_external_credentials
for each row execute function public.erp_set_updated_at();
