drop view if exists public.erp_card_hourly_summary;
create view public.erp_card_hourly_summary as
select
  store_id,
  transaction_date,
  extract(hour from transaction_time)::integer as transaction_hour,
  sum(amount_signed)::bigint as net_sales,
  (
    count(*) filter (where transaction_type = 'approval')
    - count(*) filter (where transaction_type = 'cancellation')
  )::integer as net_payment_count
from public.erp_card_transactions
group by store_id, transaction_date, extract(hour from transaction_time);

comment on view public.erp_card_hourly_summary is
  'Hourly card slip metrics. Counts are net payment slips, not unique customers.';
