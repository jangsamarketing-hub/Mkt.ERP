-- MANUAL ROLLBACK DRAFT. Never run automatically or against production
-- without a verified backup and explicit representative approval.
drop trigger if exists erp_stores_set_updated_at on public.erp_stores;
alter table public.erp_stores drop constraint if exists erp_stores_lifecycle_status_check;
alter table public.erp_stores drop constraint if exists erp_stores_environment_check;
alter table public.erp_stores drop column if exists archived_at;
alter table public.erp_stores drop column if exists manager_profile_id;
alter table public.erp_stores drop column if exists management_start_date;
alter table public.erp_stores drop column if exists environment;
alter table public.erp_stores drop column if exists lifecycle_status;
alter table public.erp_stores drop column if exists organization_id;

drop table if exists public.store_external_identifiers;
drop table if exists public.store_members;
drop table if exists public.organization_members;
drop table if exists public.profiles;
drop table if exists public.organizations;
drop function if exists public.erp_set_updated_at();
