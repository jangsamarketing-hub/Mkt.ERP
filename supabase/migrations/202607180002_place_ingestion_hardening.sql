create index if not exists erp_place_time_rows_store_id_idx
  on public.erp_place_time_rows (store_id);

create index if not exists erp_place_weekday_rows_store_id_idx
  on public.erp_place_weekday_rows (store_id);

alter function public.set_updated_at()
  set search_path = public, pg_temp;
