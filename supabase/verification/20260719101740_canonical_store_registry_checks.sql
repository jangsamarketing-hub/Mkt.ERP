-- Read-only checks to run after applying 005, 006 and 007 in a non-production copy.
select 'stores_without_organization' as check_name, count(*) as issue_count
from public.erp_stores
where organization_id is null
union all
select 'archived_without_timestamp', count(*)
from public.erp_stores
where lifecycle_status = 'archived' and archived_at is null
union all
select 'active_with_archived_timestamp', count(*)
from public.erp_stores
where lifecycle_status <> 'archived' and archived_at is not null
union all
select 'multiple_primary_external_identifiers', count(*)
from (
  select store_id, identifier_type
  from public.store_external_identifiers
  where is_primary
  group by store_id, identifier_type
  having count(*) > 1
) duplicates;

select 'erp_place_csv_uploads' as relation_name, count(*) as orphan_store_ids
from public.erp_place_csv_uploads child left join public.erp_stores store on store.id = child.store_id
where store.id is null
union all
select 'erp_place_keyword_rows', count(*)
from public.erp_place_keyword_rows child left join public.erp_stores store on store.id = child.store_id
where store.id is null
union all
select 'erp_place_channel_rows', count(*)
from public.erp_place_channel_rows child left join public.erp_stores store on store.id = child.store_id
where store.id is null
union all
select 'erp_place_time_rows', count(*)
from public.erp_place_time_rows child left join public.erp_stores store on store.id = child.store_id
where store.id is null
union all
select 'erp_place_weekday_rows', count(*)
from public.erp_place_weekday_rows child left join public.erp_stores store on store.id = child.store_id
where store.id is null
union all
select 'erp_card_imports', count(*)
from public.erp_card_imports child left join public.erp_stores store on store.id = child.store_id
where store.id is null
union all
select 'erp_card_transactions', count(*)
from public.erp_card_transactions child left join public.erp_stores store on store.id = child.store_id
where store.id is null
union all
select 'store_members', count(*)
from public.store_members child left join public.erp_stores store on store.id = child.store_id
where store.id is null
union all
select 'store_external_identifiers', count(*)
from public.store_external_identifiers child left join public.erp_stores store on store.id = child.store_id
where store.id is null;
