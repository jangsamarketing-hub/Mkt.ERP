-- Keep every internal login pair in the encrypted credential vault.
alter table public.erp_store_external_credentials
  drop constraint if exists erp_store_external_credentials_credential_kind_check;

alter table public.erp_store_external_credentials
  add constraint erp_store_external_credentials_credential_kind_check
  check (credential_kind in (
    'naver_login',
    'searchad_api',
    'instagram_login',
    'google_login',
    'kakao_map_login'
  ));
