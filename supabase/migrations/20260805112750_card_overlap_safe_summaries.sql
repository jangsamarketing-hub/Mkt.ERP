-- Keep every uploaded source file, but never double-count the same approval
-- when a monthly file and a weekly file overlap.
create or replace view public.erp_card_daily_summary as
with canonical_transactions as (
  select distinct on (
    store_id,
    transaction_date,
    transaction_time,
    transaction_type,
    approval_number,
    amount_abs,
    card_issuer,
    coalesce(affiliate_name, ''),
    coalesce(masked_card_display, '')
  ) *
  from public.erp_card_transactions
  order by
    store_id,
    transaction_date,
    transaction_time,
    transaction_type,
    approval_number,
    amount_abs,
    card_issuer,
    coalesce(affiliate_name, ''),
    coalesce(masked_card_display, ''),
    created_at,
    id
)
select
  store_id,
  transaction_date,
  sum(amount_signed)::bigint as net_sales,
  (
    count(*) filter (where transaction_type = 'approval')
    - count(*) filter (where transaction_type = 'cancellation')
  )::integer as net_payment_count,
  case
    when (
      count(*) filter (where transaction_type = 'approval')
      - count(*) filter (where transaction_type = 'cancellation')
    ) > 0
    then round(
      sum(amount_signed)::numeric /
      (
        count(*) filter (where transaction_type = 'approval')
        - count(*) filter (where transaction_type = 'cancellation')
      )
    )::bigint
    else null
  end as amount_per_payment
from canonical_transactions
group by store_id, transaction_date;

create or replace view public.erp_card_hourly_summary as
with canonical_transactions as (
  select distinct on (
    store_id,
    transaction_date,
    transaction_time,
    transaction_type,
    approval_number,
    amount_abs,
    card_issuer,
    coalesce(affiliate_name, ''),
    coalesce(masked_card_display, '')
  ) *
  from public.erp_card_transactions
  order by
    store_id,
    transaction_date,
    transaction_time,
    transaction_type,
    approval_number,
    amount_abs,
    card_issuer,
    coalesce(affiliate_name, ''),
    coalesce(masked_card_display, ''),
    created_at,
    id
)
select
  store_id,
  transaction_date,
  extract(hour from transaction_time)::integer as transaction_hour,
  sum(amount_signed)::bigint as net_sales,
  (
    count(*) filter (where transaction_type = 'approval')
    - count(*) filter (where transaction_type = 'cancellation')
  )::integer as net_payment_count
from canonical_transactions
group by store_id, transaction_date, extract(hour from transaction_time);
