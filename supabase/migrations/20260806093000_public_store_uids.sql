-- Public client links use an opaque store UID, not the Naver MID.
alter table public.erp_stores add column if not exists public_uid text;

update public.erp_stores
set public_uid = replace(gen_random_uuid()::text, '-', '')
where public_uid is null or btrim(public_uid) = '';

alter table public.erp_stores alter column public_uid set not null;
create unique index if not exists erp_stores_public_uid_idx on public.erp_stores (public_uid);
