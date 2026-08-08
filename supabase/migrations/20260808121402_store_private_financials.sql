alter table public.erp_store_private_profiles
  add column if not exists business_start_date date,
  add column if not exists rental_deposit numeric(16,2),
  add column if not exists monthly_rent numeric(16,2);

alter table public.erp_store_private_profiles
  add constraint erp_store_private_profiles_rental_deposit_non_negative
  check (rental_deposit is null or rental_deposit >= 0) not valid;

alter table public.erp_store_private_profiles
  add constraint erp_store_private_profiles_monthly_rent_non_negative
  check (monthly_rent is null or monthly_rent >= 0) not valid;
