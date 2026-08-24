-- Align every enabled SearchAd account with the fixed operating schedule.
-- Vercel Cron invokes the collector at 10:00 and 17:00 Asia/Seoul.

alter table public.erp_searchad_sync_configs
  alter column daily_sync_times
  set default array['10:00:00'::time, '17:00:00'::time];

update public.erp_searchad_sync_configs
set daily_sync_times = array['10:00:00'::time, '17:00:00'::time],
    timezone = 'Asia/Seoul'
where daily_sync_times is distinct from array['10:00:00'::time, '17:00:00'::time]
   or timezone is distinct from 'Asia/Seoul';
