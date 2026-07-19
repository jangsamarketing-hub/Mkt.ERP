-- Stage 1C / data backfill. Keep separate from schema DDL.
insert into public.organizations (name, slug)
values ('맞춤장사 OS', 'custom-business-os')
on conflict (slug) do update set name = excluded.name;

update public.erp_stores
set
  organization_id = (select id from public.organizations where slug = 'custom-business-os'),
  management_start_date = coalesce(management_start_date, contract_start_date),
  lifecycle_status = coalesce(lifecycle_status, 'active'),
  environment = coalesce(environment, 'production')
where organization_id is null
   or management_start_date is null;

-- Preserve the legacy MID while moving external identifiers to a typed ledger.
insert into public.store_external_identifiers (
  store_id,
  identifier_type,
  identifier_value,
  label,
  is_primary
)
select
  id,
  'naver_place_mid',
  naver_mid,
  '기존 erp_stores.naver_mid',
  true
from public.erp_stores
where nullif(btrim(naver_mid), '') is not null
  and not exists (
    select 1
    from public.store_external_identifiers existing
    where existing.store_id = erp_stores.id
      and existing.identifier_type = 'naver_place_mid'
      and existing.is_primary
  )
on conflict (store_id, identifier_type, identifier_value) do nothing;
