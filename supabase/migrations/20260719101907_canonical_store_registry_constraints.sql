-- Stage 1C / contract the new invariant only after the backfill succeeds.
do $$
begin
  if exists (select 1 from public.erp_stores where organization_id is null) then
    raise exception 'erp_stores.organization_id backfill is incomplete';
  end if;
  if exists (
    select 1
    from public.store_external_identifiers
    group by store_id, identifier_type
    having count(*) filter (where is_primary) > 1
  ) then
    raise exception 'multiple primary external identifiers exist';
  end if;
end $$;

alter table public.erp_stores
  alter column organization_id set not null;
